// XP, levels, and personal bests (spec R2, R3).
import { normalizeName } from './workout.js';

export const BASE_XP = 20;
export const XP_PER_SET = 5;
export const XP_PER_LEVEL = 100;

/** The empty game state. `bests` maps normalized exercise name → { name, weight, reps }. */
export function createInitialState() {
  return { workouts: [], totalXp: 0, pbLevels: 0, bests: {}, draft: { sets: [] } };
}

/** R2.1 */
export function xpForWorkout(setCount) {
  return BASE_XP + XP_PER_SET * setCount;
}

/** R2.2 */
export function xpLevels(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL);
}

/** R2.3: XP gained inside the current XP level. */
export function xpProgress(totalXp) {
  return { current: totalXp % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

/** R3.5 */
export function levelOf(state) {
  return 1 + xpLevels(state.totalXp) + state.pbLevels;
}

/** R3.1: heavier wins; at equal weight, more reps wins. */
export function isBetterSet(candidate, best) {
  if (candidate.weight !== best.weight) return candidate.weight > best.weight;
  return candidate.reps > best.reps;
}

/**
 * R2.1, R3.2–R3.4: finish the draft workout.
 * Returns { ok: false, state, error } for an empty draft (R1.5), otherwise
 * { ok: true, state, result } where result describes what was earned.
 */
export function completeWorkout(state, now = new Date()) {
  const sets = state.draft.sets;
  if (sets.length === 0) {
    return { ok: false, state, error: 'Add at least one set first.' };
  }

  const bests = { ...state.bests };
  const pbByKey = new Map(); // keeps first-PB order; value is the latest PB set

  for (const s of sets) {
    const key = normalizeName(s.exercise);
    const prev = bests[key];
    if (!prev) {
      bests[key] = { name: s.exercise, weight: s.weight, reps: s.reps }; // R3.2 baseline
    } else if (isBetterSet(s, prev)) {
      bests[key] = { name: prev.name, weight: s.weight, reps: s.reps };
      pbByKey.set(key, bests[key]);
    }
  }

  const xpEarned = xpForWorkout(sets.length);
  const pbLevelsEarned = pbByKey.size; // R3.4: one level per exercise
  const workout = {
    id: `${now.getTime()}-${state.workouts.length}`,
    completedAt: now.toISOString(),
    sets,
    xp: xpEarned,
  };

  const next = {
    ...state,
    workouts: [...state.workouts, workout],
    totalXp: state.totalXp + xpEarned,
    pbLevels: state.pbLevels + pbLevelsEarned,
    bests,
    draft: { sets: [] },
  };

  return {
    ok: true,
    state: next,
    result: {
      xpEarned,
      pbLevelsEarned,
      personalBests: [...pbByKey.values()].map((b) => ({ ...b })),
      levelBefore: levelOf(state),
      levelAfter: levelOf(next),
    },
  };
}
