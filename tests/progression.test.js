import { describe, it, expect } from 'vitest';
import { addSet } from '../src/logic/workout.js';
import {
  createInitialState,
  xpForWorkout,
  xpLevels,
  levelOf,
  xpProgress,
  isBetterSet,
  completeWorkout,
} from '../src/logic/progression.js';

/** Build a state by completing workouts given as arrays of [exercise, weight, reps]. */
function play(...workouts) {
  let state = createInitialState();
  let last;
  for (const sets of workouts) {
    for (const [exercise, weight, reps] of sets) {
      state = addSet(state, { exercise, weight, reps }).state;
    }
    last = completeWorkout(state, new Date('2026-11-22T10:00:00Z'));
    state = last.state;
  }
  return { state, result: last.result };
}

describe('R2 XP from completed workouts', () => {
  it('R2.1: awards 20 + 5 per set', () => {
    expect(xpForWorkout(1)).toBe(25);
    expect(xpForWorkout(4)).toBe(40);
  });

  it('R2.1: completing a workout adds its XP and records it', () => {
    const { state, result } = play([['Squat', 100, 5], ['Squat', 100, 5], ['Row', 60, 8]]);
    expect(result.xpEarned).toBe(35);
    expect(state.totalXp).toBe(35);
    expect(state.workouts).toHaveLength(1);
    expect(state.workouts[0].sets).toHaveLength(3);
    expect(state.workouts[0].xp).toBe(35);
    expect(state.workouts[0].completedAt).toBe('2026-11-22T10:00:00.000Z');
    expect(state.draft.sets).toHaveLength(0);
  });

  it('R2.2: every 100 XP is one level', () => {
    expect(xpLevels(0)).toBe(0);
    expect(xpLevels(99)).toBe(0);
    expect(xpLevels(100)).toBe(1);
    expect(xpLevels(250)).toBe(2);
  });

  it('R2.2: XP alone levels you up after enough workouts', () => {
    // 4 single-set workouts of different exercises: no PBs, 4 × 25 = 100 XP.
    const { state, result } = play([['A', 1, 1]], [['B', 1, 1]], [['C', 1, 1]], [['D', 1, 1]]);
    expect(state.totalXp).toBe(100);
    expect(levelOf(state)).toBe(2);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2);
  });

  it('R2.3: reports progress toward the next XP level', () => {
    expect(xpProgress(0)).toEqual({ current: 0, needed: 100 });
    expect(xpProgress(235)).toEqual({ current: 35, needed: 100 });
  });
});

describe('R3 personal bests level you up', () => {
  it('R3.1: heavier weight beats the best', () => {
    expect(isBetterSet({ weight: 105, reps: 1 }, { weight: 100, reps: 10 })).toBe(true);
  });

  it('R3.1: same weight with more reps beats the best', () => {
    expect(isBetterSet({ weight: 100, reps: 6 }, { weight: 100, reps: 5 })).toBe(true);
  });

  it('R3.1: same set, fewer reps, or lighter weight does not beat the best', () => {
    const best = { weight: 100, reps: 5 };
    expect(isBetterSet({ weight: 100, reps: 5 }, best)).toBe(false);
    expect(isBetterSet({ weight: 100, reps: 4 }, best)).toBe(false);
    expect(isBetterSet({ weight: 95, reps: 20 }, best)).toBe(false);
  });

  it('R3.2: the first set of an exercise is a baseline, not a PB', () => {
    const { state, result } = play([['Squat', 100, 5]]);
    expect(result.personalBests).toEqual([]);
    expect(state.pbLevels).toBe(0);
    expect(state.bests.squat).toEqual({ name: 'Squat', weight: 100, reps: 5 });
  });

  it('R3.2 / R3.5: beating the baseline in a later workout gives a level', () => {
    const { state, result } = play([['Squat', 100, 5]], [['Squat', 100, 6]]);
    expect(result.personalBests).toEqual([{ name: 'Squat', weight: 100, reps: 6 }]);
    expect(state.pbLevels).toBe(1);
    expect(levelOf(state)).toBe(2); // 50 XP → 0 XP levels, +1 PB level
  });

  it('R3.3: later sets in the same workout are compared against earlier ones', () => {
    // First set is the baseline; second set beats it within the same workout.
    const { state, result } = play([['Squat', 100, 5], ['Squat', 110, 5]]);
    expect(result.personalBests).toEqual([{ name: 'Squat', weight: 110, reps: 5 }]);
    expect(state.bests.squat).toEqual({ name: 'Squat', weight: 110, reps: 5 });
  });

  it('R3.3: a weaker later set does not lower the stored best', () => {
    const { state } = play([['Squat', 120, 5]], [['Squat', 100, 8]]);
    expect(state.bests.squat).toEqual({ name: 'Squat', weight: 120, reps: 5 });
    expect(state.pbLevels).toBe(0);
  });

  it('R3.4: several PB sets on one exercise in one workout give one level', () => {
    const { state, result } = play(
      [['Squat', 100, 5]],
      [['Squat', 105, 5], ['Squat', 110, 5], ['Squat', 115, 5]],
    );
    expect(result.personalBests).toEqual([{ name: 'Squat', weight: 115, reps: 5 }]);
    expect(result.pbLevelsEarned).toBe(1);
    expect(state.pbLevels).toBe(1);
  });

  it('R3.4: PBs on two exercises in one workout give two levels', () => {
    const { state, result } = play(
      [['Squat', 100, 5], ['Bench', 80, 5]],
      [['Squat', 105, 5], ['bench', 80, 6]],
    );
    expect(result.pbLevelsEarned).toBe(2);
    expect(state.pbLevels).toBe(2);
    expect(result.personalBests.map((p) => p.name)).toEqual(['Squat', 'Bench']);
  });

  it('R3.5: level = 1 + XP levels + PB levels', () => {
    expect(levelOf({ totalXp: 0, pbLevels: 0 })).toBe(1);
    expect(levelOf({ totalXp: 250, pbLevels: 3 })).toBe(6);
  });

  it('R3.6: the result reports level before and after for announcements', () => {
    const { result } = play([['Squat', 100, 5]], [['Squat', 110, 5]]);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2);
  });
});
