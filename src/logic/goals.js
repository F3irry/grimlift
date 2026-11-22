// Fitness goals (spec R11). A goal stores only its target and, where needed,
// where the user was when it was set; progress and "reached" are derived.
import { normalizeName, toNumber, MAX_REPS } from './entries.js';
import { UNITS, toKg, formatWeight } from './units.js';
import { currentBodyWeightKg, validateBodyWeight } from './bodyweight.js';
import { dayKey, parseDayKey, weekKey, weekDays } from './dates.js';

export const MAX_GOALS = 12;
export const MAX_HABIT_NAME = 60;
export const MAX_NOTE = 140;
export const GOAL_TYPES = ['lift', 'bodyweight', 'training', 'habit'];
export const GOAL_GROUPS = {
  lift: 'Muscle growth',
  bodyweight: 'How I want to look',
  training: 'Health habits',
  habit: 'Health habits',
};
const SAME_WEIGHT_KG = 0.01; // as in R3.1
const MIN_BODY_CHANGE_KG = 0.1;

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const wholeInRange = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const cleanText = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const daysLeftText = (n) => (n <= 0 ? 'Done this week' : `${n} more day${n === 1 ? '' : 's'} this week`);

function validDays(value) {
  const n = toNumber(value);
  return wholeInRange(n, 1, 7) ? n : null;
}
const DAYS_ERROR = 'Days per week must be a whole number from 1 to 7.';

// ---------- lift targets (R11.2) ----------

/** Heaviest kg logged for `exercise` with at least `minReps` reps (0 if none). */
function bestKgWithReps(entries, exercise, minReps) {
  const key = normalizeName(exercise);
  let best = 0;
  for (const e of entries) {
    if (normalizeName(e.exercise) === key && e.reps >= minReps) best = Math.max(best, toKg(e.weight, e.unit));
  }
  return best;
}

const liftTargetKg = (g) => toKg(g.targetWeight, g.unit);
const meetsKg = (kg, targetKg) => kg >= targetKg - SAME_WEIGHT_KG;

function buildLift(profile, input) {
  const exercise = cleanText(input.exercise);
  if (!exercise) return { error: 'Name the exercise.' };
  const targetWeight = toNumber(input.targetWeight);
  if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
    return { error: 'Target weight must be a number above 0.' };
  }
  if (!UNITS.includes(input.unit)) return { error: 'Pick a unit: kg or lb.' };
  const targetReps = toNumber(input.targetReps);
  if (!wholeInRange(targetReps, 1, MAX_REPS)) {
    return { error: `Target reps must be a whole number from 1 to ${MAX_REPS}.` };
  }
  const baselineKg = bestKgWithReps(profile.entries, exercise, targetReps);
  if (meetsKg(baselineKg, toKg(targetWeight, input.unit)) && baselineKg > 0) {
    return { error: 'You already lift that. Set a higher target.' };
  }
  return { goal: { type: 'lift', exercise, targetWeight, unit: input.unit, targetReps, baselineKg } };
}

function liftReached(g, profile) {
  const key = normalizeName(g.exercise);
  const target = liftTargetKg(g);
  return profile.entries.some(
    (e) =>
      e.loggedAt >= g.createdAt &&
      normalizeName(e.exercise) === key &&
      e.reps >= g.targetReps &&
      meetsKg(toKg(e.weight, e.unit), target),
  );
}

function liftStatus(g, profile, reached) {
  const target = liftTargetKg(g);
  const best = bestKgWithReps(profile.entries, g.exercise, g.targetReps);
  const progress = reached ? 1 : clamp01((best - g.baselineKg) / (target - g.baselineKg));
  return {
    title: `${g.exercise} ${formatWeight(target, g.unit)} × ${g.targetReps}`,
    progress,
    remaining: reached ? 'Reached' : `${formatWeight(Math.max(0, target - best), g.unit)} to go`,
  };
}

// ---------- body-weight targets (R11.3) ----------

function buildBodyweight(profile, input) {
  const startKg = currentBodyWeightKg(profile);
  if (startKg == null) return { error: 'Save your body weight first.' };
  const v = validateBodyWeight(input.targetWeight, profile.unit);
  if (!v.ok) return { error: v.error.replace('Body weight', 'Target weight') };
  if (Math.abs(v.kg - startKg) < MIN_BODY_CHANGE_KG) {
    return { error: 'Target must differ from your current body weight.' };
  }
  return { goal: { type: 'bodyweight', targetKg: v.kg, startKg } };
}

const losing = (g) => g.targetKg < g.startKg;
const atOrPast = (g, kg) => (losing(g) ? kg <= g.targetKg : kg >= g.targetKg);

function bodyweightReached(g, profile) {
  return profile.weighIns.some((w) => w.at >= g.createdAt && atOrPast(g, w.kg));
}

function bodyweightStatus(g, profile, reached) {
  const current = currentBodyWeightKg(profile);
  const title = `Reach ${formatWeight(g.targetKg, profile.unit)}`;
  if (reached) return { title, progress: 1, remaining: 'Reached' };
  if (current == null) return { title, progress: 0, remaining: 'No body weight saved' };
  return {
    title,
    progress: clamp01((g.startKg - current) / (g.startKg - g.targetKg)),
    remaining: `${formatWeight(Math.abs(current - g.targetKg), profile.unit)} to ${losing(g) ? 'lose' : 'gain'}`,
  };
}

// ---------- weekly targets (R11.4, R11.5) ----------

/** True if any week has at least `n` distinct day keys. */
function anyWeekHas(days, n) {
  const perWeek = new Map();
  for (const d of new Set(days)) {
    const w = weekKey(parseDayKey(d));
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  return [...perWeek.values()].some((count) => count >= n);
}

function daysThisWeek(days, now) {
  const week = new Set(weekDays(now));
  return new Set(days.filter((d) => week.has(d))).size;
}

const entryDays = (entries) => entries.map((e) => dayKey(new Date(e.loggedAt)));

function trainingReached(g, profile) {
  return anyWeekHas(entryDays(profile.entries.filter((e) => e.loggedAt >= g.createdAt)), g.daysPerWeek);
}

function habitReached(g) {
  return anyWeekHas(g.checks, g.daysPerWeek);
}

function weeklyStatus(title, days, g, now) {
  const done = daysThisWeek(days, now);
  return { title, progress: clamp01(done / g.daysPerWeek), remaining: daysLeftText(g.daysPerWeek - done) };
}

// ---------- public API ----------

/** R11.1–R11.5: validate and add a goal. */
export function addGoal(profile, input = {}, now = new Date()) {
  const fail = (error) => ({ ok: false, profile, error });
  if (!GOAL_TYPES.includes(input.type)) return fail('Pick a goal type.');
  if (profile.goals.length >= MAX_GOALS) return fail(`You can have up to ${MAX_GOALS} goals. Delete one first.`);

  let built;
  if (input.type === 'lift') built = buildLift(profile, input);
  else if (input.type === 'bodyweight') built = buildBodyweight(profile, input);
  else {
    const daysPerWeek = validDays(input.daysPerWeek);
    if (input.type === 'habit') {
      const name = cleanText(input.name);
      if (!name || name.length > MAX_HABIT_NAME) {
        built = { error: `Name the habit (up to ${MAX_HABIT_NAME} characters).` };
      } else if (daysPerWeek == null) built = { error: DAYS_ERROR };
      else built = { goal: { type: 'habit', name, daysPerWeek, checks: [] } };
    } else {
      built = daysPerWeek == null ? { error: DAYS_ERROR } : { goal: { type: 'training', daysPerWeek } };
    }
  }
  if (built.error) return fail(built.error);

  const goal = {
    id: `g${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    ...built.goal,
  };
  return { ok: true, profile: { ...profile, goals: [...profile.goals, goal] }, goal };
}

/** R11.7 */
export function deleteGoal(profile, id) {
  return { ...profile, goals: profile.goals.filter((g) => g.id !== id) };
}

/** R11.5: tick or untick a day of the current week, from creation day to today. */
export function toggleHabitDay(profile, goalId, day, now = new Date()) {
  const goal = profile.goals.find((g) => g.id === goalId && g.type === 'habit');
  if (!goal) return { ok: false, profile, error: 'Habit not found.' };
  const inWeek = weekDays(now).includes(day);
  if (!inWeek || day < dayKey(new Date(goal.createdAt)) || day > dayKey(now)) {
    return { ok: false, profile, error: 'You can only tick days this week, from when you set the habit up to today.' };
  }
  const checks = goal.checks.includes(day)
    ? goal.checks.filter((d) => d !== day)
    : [...goal.checks, day].sort();
  const next = { ...goal, checks };
  return { ok: true, profile: { ...profile, goals: profile.goals.map((g) => (g.id === goalId ? next : g)) } };
}

/** R11.2–R11.5: has this goal been reached? */
export function isReached(goal, profile) {
  switch (goal.type) {
    case 'lift': return liftReached(goal, profile);
    case 'bodyweight': return bodyweightReached(goal, profile);
    case 'training': return trainingReached(goal, profile);
    case 'habit': return habitReached(goal);
    default: return false;
  }
}

/** R11.6: what to show for one goal. */
export function goalStatus(goal, profile, now = new Date()) {
  const reached = isReached(goal, profile);
  let s;
  if (goal.type === 'lift') s = liftStatus(goal, profile, reached);
  else if (goal.type === 'bodyweight') s = bodyweightStatus(goal, profile, reached);
  else if (goal.type === 'training') {
    s = weeklyStatus(`Train ${goal.daysPerWeek} day${goal.daysPerWeek === 1 ? '' : 's'} a week`, entryDays(profile.entries), goal, now);
  } else {
    s = weeklyStatus(`${goal.name} · ${goal.daysPerWeek} day${goal.daysPerWeek === 1 ? '' : 's'} a week`, goal.checks, goal, now);
  }
  return {
    id: goal.id,
    type: goal.type,
    group: GOAL_GROUPS[goal.type],
    ...s,
    percent: Math.round(s.progress * 100),
    reached,
  };
}

/** R11.8 */
export function reachedGoalIds(profile) {
  return profile.goals.filter((g) => isReached(g, profile)).map((g) => g.id);
}

/** R11.8: one level per reached goal. */
export function goalLevels(profile) {
  return reachedGoalIds(profile).length;
}

/** R11.9 */
export function setGoalNote(profile, text) {
  const goalNote = String(text ?? '').trim();
  if (goalNote.length > MAX_NOTE) return { ok: false, profile, error: `The note must be ${MAX_NOTE} characters or fewer.` };
  return { ok: true, profile: { ...profile, goalNote } };
}

