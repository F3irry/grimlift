// XP, personal bests, level, and feedback (spec R2, R3, R6).
// Totals are always derived by replaying a profile's entries in order.
import { normalizeName, validateEntry } from './entries.js';
import { toKg } from './units.js';
import { goalLevels, reachedGoalIds, goalStatus } from './goals.js';
import { comebacks, comebackText, COMEBACK_XP } from './streaks.js';
import { challengeXp, currentChallenges, CHALLENGE_XP } from './challenges.js';

export const BASE_XP = 20;
export const XP_PER_SET = 5;
export const XP_PER_LEVEL = 100;
const SAME_WEIGHT_KG = 0.01;

/** R2.1 */
export function xpForEntry(sets) {
  return BASE_XP + XP_PER_SET * sets;
}

/** R2.2 */
export function xpLevels(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL);
}

/** R2.3: XP gained inside the current XP level. */
export function xpProgress(totalXp) {
  return { current: totalXp % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

/** R3.4: level from XP, PB levels, and goal levels (R11.8). */
export function levelFor(totalXp, pbLevels, goalLvls = 0) {
  return 1 + xpLevels(totalXp) + pbLevels + goalLvls;
}

/** R3.4: everything that makes up a profile's level. XP includes challenge XP (R2.1, R13.7). */
export function profileLevel(profile, now = new Date()) {
  const s = summarize(profile.entries);
  const totalXp = s.totalXp + challengeXp(profile, now);
  const { pbLevels } = s;
  const gl = goalLevels(profile);
  return { totalXp, pbLevels, goalLevels: gl, level: levelFor(totalXp, pbLevels, gl) };
}

/**
 * R6.1: what changed between two versions of a profile: challenges newly
 * completed this week (R13.12), goals newly reached, and the level before and
 * after. Used for weigh-ins and habit ticks too.
 */
export function progressChange(before, after, now = new Date()) {
  const wasDone = new Set(currentChallenges(before, now).filter((c) => c.done).map((c) => c.id));
  const challengesDone = currentChallenges(after, now)
    .filter((c) => c.done && !wasDone.has(c.id))
    .map((c) => ({ id: c.id, title: c.title }));
  const had = new Set(reachedGoalIds(before));
  const goalsReached = reachedGoalIds(after)
    .filter((id) => !had.has(id))
    .map((id) => {
      const s = goalStatus(after.goals.find((g) => g.id === id), after, now);
      return { id, title: s.title };
    });
  const levelAfter = profileLevel(after, now);
  return {
    xpEarned: CHALLENGE_XP * challengesDone.length,
    comeback: null,
    challengesDone,
    personalBest: false,
    goalsReached,
    levelBefore: profileLevel(before, now).level,
    levelAfter: levelAfter.level,
    totalXp: levelAfter.totalXp,
  };
}

/** R3.1: heavier (in kg) wins; within 0.01 kg, more reps wins. */
export function isBetter(candidate, best) {
  const diff = toKg(candidate.weight, candidate.unit) - toKg(best.weight, best.unit);
  if (Math.abs(diff) >= SAME_WEIGHT_KG) return diff > 0;
  return candidate.reps > best.reps;
}

/**
 * Replay entries to get totals. `bests` maps normalized name →
 * { name, weight, reps, unit, kg }, where name is the first typed name (R1.3).
 */
export function summarize(entries) {
  let totalXp = 0;
  let pbLevels = 0;
  const bests = {};
  const pbIds = new Set();
  const comebackIds = comebacks(entries); // R12.5

  for (const e of entries) {
    totalXp += xpForEntry(e.sets) + (comebackIds.has(e.id) ? COMEBACK_XP : 0);
    const key = normalizeName(e.exercise);
    const prev = bests[key];
    if (!prev || isBetter(e, prev)) {
      if (prev) {
        pbLevels += 1; // R3.3
        pbIds.add(e.id);
      }
      bests[key] = {
        name: prev ? prev.name : e.exercise, // R3.2: first entry is only a baseline
        weight: e.weight,
        reps: e.reps,
        unit: e.unit,
        kg: toKg(e.weight, e.unit),
      };
    }
  }

  return { totalXp, pbLevels, level: levelFor(totalXp, pbLevels), bests, pbIds, comebackIds };
}

function newId(now) {
  return `e${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * R1, R2.1, R3: validate and log an entry into `profile`.
 * Returns { ok: false, profile, error } or { ok: true, profile, result }.
 */
export function logEntry(profile, input, now = new Date()) {
  const v = validateEntry(input);
  if (!v.ok) return { ok: false, profile, error: v.error };

  const entry = { id: newId(now), loggedAt: now.toISOString(), ...v.entry };
  const next = { ...profile, entries: [...profile.entries, entry] };
  const after = summarize(next.entries);
  const best = after.bests[normalizeName(entry.exercise)];
  const lostWeeks = after.comebackIds.get(entry.id);
  const comeback = lostWeeks ? { lostWeeks, bonusXp: COMEBACK_XP } : null; // R12.5

  const change = progressChange(profile, next, now);
  return {
    ok: true,
    profile: next,
    result: {
      ...change,
      entry,
      exerciseName: best.name,
      xpEarned: xpForEntry(entry.sets) + (comeback ? comeback.bonusXp : 0) + change.xpEarned,
      comeback,
      personalBest: after.pbIds.has(entry.id),
    },
  };
}

/** R1.4: remove an entry; totals follow automatically because they are derived. */
export function deleteEntry(profile, entryId) {
  return { ...profile, entries: profile.entries.filter((e) => e.id !== entryId) };
}

/** R6.1: feedback events for one change, in display order. */
export function feedbackFor(result) {
  const events = [];
  if (result.xpEarned > 0) {
    events.push({ type: 'xp', amount: result.xpEarned, text: `+${result.xpEarned} XP` });
  }
  if (result.comeback) {
    const { lostWeeks, bonusXp } = result.comeback;
    events.push({ type: 'comeback', lostWeeks, bonusXp, text: comebackText(lostWeeks) }); // R12.6
  }
  for (const c of result.challengesDone ?? []) {
    events.push({ type: 'challenge', id: c.id, title: c.title, xp: CHALLENGE_XP, text: `Challenge done: ${c.title} · +${CHALLENGE_XP} XP` }); // R13.12
  }
  if (result.personalBest) {
    const { weight, reps, unit } = result.entry;
    events.push({
      type: 'pb',
      exercise: result.exerciseName,
      weight,
      reps,
      unit,
      text: `New personal best: ${result.exerciseName} ${weight} ${unit} × ${reps}`,
    });
  }
  for (const g of result.goalsReached ?? []) {
    events.push({ type: 'goal', id: g.id, title: g.title, text: `Goal reached: ${g.title}` });
  }
  if (result.levelAfter > result.levelBefore) {
    events.push({ type: 'level', level: result.levelAfter, text: `Level ${result.levelAfter}` });
  }
  return events;
}
