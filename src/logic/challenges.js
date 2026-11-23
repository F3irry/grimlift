// Weekly challenges and healthy-pace warnings (spec R13.7–R13.11).
// A week's challenges are derived from data saved before the week started,
// so they don't move while you log; whether they're done is derived too.
import { normalizeName } from './entries.js';
import { toKg, fromKg, formatWeight, roundTenth } from './units.js';
import { isReached, bestKgWithReps } from './goals.js';
import { dayKey, parseDayKey, weekKey, weekDays, shiftWeek } from './dates.js';
import { limitationsForWeek } from './limitations.js';
import { findExercise, isAllowed } from './exercises.js';

export const CHALLENGE_XP = 30;
export const MAX_CHALLENGES = 3;
export const MAX_TRAINING_DAYS = 6;
export const START_DAYS = 2;
export const LIFT_STEP = { beginner: 0.025, intermediate: 0.05, advanced: 0.05 };
/** R13.10: largest healthy change per week, as a share of body weight. */
export const PACE = { losing: 0.01, gaining: 0.005 };
const INCREMENT = { kg: 0.5, lb: 1 };
const SAME_WEIGHT_KG = 0.01; // as in R3.1
const DAY_MS = 24 * 60 * 60 * 1000;

const time = (iso) => new Date(iso).getTime();
const days = (entries) => new Set(entries.map((e) => dayKey(new Date(e.loggedAt))));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const losing = (g) => g.targetKg < g.startKg;

function weekWindow(profile, week) {
  const start = parseDayKey(week).getTime();
  const end = parseDayKey(shiftWeek(week, 1)).getTime();
  const inRange = (t) => t >= start && t < end;
  return {
    start,
    end,
    before: {
      ...profile,
      entries: profile.entries.filter((e) => time(e.loggedAt) < start),
      weighIns: profile.weighIns.filter((w) => time(w.at) < start),
    },
    entries: profile.entries.filter((e) => inRange(time(e.loggedAt))),
    weighIns: profile.weighIns.filter((w) => inRange(time(w.at))),
    goals: profile.goals.filter((g) => time(g.createdAt) < end),
  };
}

/** R13.8: train N days, or rest after a 7-day week. */
function trainOrRest(profile, week, win, now) {
  const prev = weekWindow(profile, shiftWeek(week, -1));
  const last = days(prev.entries).size;
  const trained = days(win.entries);
  if (last === 7) {
    const today = dayKey(now);
    return {
      id: 'rest',
      kind: 'rest',
      title: 'Take a rest day this week',
      detail: 'You trained all 7 days last week. Muscle grows while you rest, so give it a day.',
      done: weekDays(parseDayKey(week)).some((d) => d < today && !trained.has(d)),
    };
  }
  const goalDays = win.goals.filter((g) => g.type === 'training').map((g) => g.daysPerWeek);
  const g = goalDays.length ? Math.max(...goalDays) : START_DAYS;
  const n = Math.min(g, Math.max(START_DAYS, last + 1), MAX_TRAINING_DAYS);
  return {
    id: 'train',
    kind: 'train',
    title: `Train ${plural(n, 'day')} this week`,
    detail: `Build up one day at a time. ${trained.size} of ${n} done so far.`,
    done: trained.size >= n,
  };
}

/** R13.10: weigh in this week, with the healthy pace. */
function bodyweightChallenge(profile, g, win) {
  const ref = win.before.weighIns.length ? win.before.weighIns[win.before.weighIns.length - 1].kg : g.startKg;
  const pace = ref * (losing(g) ? PACE.losing : PACE.gaining);
  return {
    id: `bw:${g.id}`,
    kind: 'bodyweight',
    title: 'Weigh in this week',
    detail: `Healthy pace: up to ${formatWeight(pace, profile.unit)} a week toward ${formatWeight(g.targetKg, profile.unit)}. Slow and steady holds.`,
    done: win.weighIns.some((w) => time(w.at) >= time(g.createdAt)),
  };
}

/** R13.9: a small step on a lift goal, or null if limitations block it. */
function liftChallenge(g, win, limits) {
  const known = findExercise(g.exercise);
  if (known && !isAllowed(known, limits)) return null;
  const key = normalizeName(g.exercise);
  const goalText = `Your goal: ${roundTenth(g.targetWeight)} ${g.unit} × ${g.targetReps}.`;
  const logged = win.entries.filter((e) => normalizeName(e.exercise) === key && time(e.loggedAt) >= time(g.createdAt));
  const best = bestKgWithReps(win.before.entries, g.exercise, g.targetReps);
  const base = { id: `lift:${g.id}`, kind: 'lift' };

  if (best === 0) {
    return {
      ...base,
      title: `${g.exercise} × ${g.targetReps} reps`,
      detail: `Any weight you control with good form. ${goalText}`,
      done: logged.some((e) => e.reps >= g.targetReps),
    };
  }
  const step = LIFT_STEP[limits.experience];
  const inc = INCREMENT[g.unit];
  const stepped = Math.floor((fromKg(best, g.unit) * (1 + step)) / inc + 1e-9) * inc;
  const weight = Math.min(stepped, g.targetWeight);
  let kg = toKg(weight, g.unit);
  let reps = g.targetReps;
  let title = `${g.exercise} ${roundTenth(weight)} ${g.unit} × ${reps}`;
  let detail = `A ${roundTenth(step * 100)}% step up from ${formatWeight(best, g.unit)}. ${goalText}`;
  if (kg <= best + SAME_WEIGHT_KG) {
    kg = best;
    reps = g.targetReps + 1;
    title = `${g.exercise} ${formatWeight(best, g.unit)} × ${reps}`;
    detail = `One more rep at your best weight. ${goalText}`;
  }
  return {
    ...base,
    title,
    detail,
    done: logged.some((e) => e.reps >= reps && toKg(e.weight, e.unit) >= kg - SAME_WEIGHT_KG),
  };
}

/** R13.7: the challenges of week `week` (a Monday key), at most three. */
export function weekChallenges(profile, week, now = new Date()) {
  const win = weekWindow(profile, week);
  const limits = limitationsForWeek(profile, week);
  const open = (type) => win.goals.filter((g) => g.type === type && !isReached(g, win.before));
  const list = [trainOrRest(profile, week, win, now)];
  const bw = open('bodyweight')[0];
  if (bw) list.push(bodyweightChallenge(profile, bw, win));
  for (const g of open('lift')) {
    const c = liftChallenge(g, win, limits);
    if (c) list.push(c);
  }
  return list.slice(0, MAX_CHALLENGES);
}

/** R13.7: this week's challenges. */
export function currentChallenges(profile, now = new Date()) {
  return weekChallenges(profile, weekKey(now), now);
}

/** R13.7: +30 XP per completed challenge, every week from the first entry or weigh-in to now. */
export function challengeXp(profile, now = new Date()) {
  const stamps = [...profile.entries.map((e) => e.loggedAt), ...profile.weighIns.map((w) => w.at)];
  if (!stamps.length) return 0;
  const first = stamps.map((s) => weekKey(new Date(s))).sort()[0];
  const last = weekKey(now);
  let done = 0;
  for (let w = first; w <= last; w = shiftWeek(w, 1)) {
    done += weekChallenges(profile, w, now).filter((c) => c.done).length;
  }
  return done * CHALLENGE_XP;
}

/** R13.11: warnings for body-weight goals moving faster than a healthy pace. */
export function paceWarnings(profile) {
  const list = profile.weighIns;
  if (list.length < 2) return [];
  const latest = list[list.length - 1];
  const older = list.filter((w) => time(w.at) <= time(latest.at) - 7 * DAY_MS);
  if (!older.length) return [];
  const prev = older[older.length - 1];
  const weekly = ((latest.kg - prev.kg) / (time(latest.at) - time(prev.at))) * 7 * DAY_MS;
  const warnings = [];
  for (const g of profile.goals) {
    if (g.type !== 'bodyweight' || isReached(g, profile)) continue;
    const lose = losing(g);
    const toward = lose ? -weekly : weekly;
    const limit = prev.kg * (lose ? PACE.losing : PACE.gaining);
    if (toward <= limit + 1e-9) continue;
    const fmt = (kg) => formatWeight(kg, profile.unit);
    warnings.push({
      goalId: g.id,
      text: lose
        ? `You're losing about ${fmt(toward)} a week, faster than the healthy pace of ${fmt(limit)}. Slow it down: eat enough, sleep, and keep lifting.`
        : `You're gaining about ${fmt(toward)} a week, faster than the healthy pace of ${fmt(limit)}. Slow it down: steady meals and steady training.`,
    });
  }
  return warnings;
}
