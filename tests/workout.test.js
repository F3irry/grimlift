import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  validateSet,
  addSet,
  removeSet,
  exerciseSuggestions,
} from '../src/logic/workout.js';
import { createInitialState, completeWorkout } from '../src/logic/progression.js';

const set = (exercise, weight, reps) => ({ exercise, weight, reps });

describe('R1 logging sets', () => {
  it('R1.1: accepts a set with exercise, weight, and reps', () => {
    const r = validateSet(set('Squat', '135', '5'));
    expect(r.ok).toBe(true);
    expect(r.set).toEqual({ exercise: 'Squat', weight: 135, reps: 5 });
  });

  it('R1.1: trims the exercise name', () => {
    expect(validateSet(set('  Deadlift  ', 225, 3)).set.exercise).toBe('Deadlift');
  });

  it('R1.1: rejects an empty or blank exercise name', () => {
    for (const name of ['', '   ', undefined]) {
      const r = validateSet(set(name, 100, 5));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/exercise/i);
    }
  });

  it('R1.2: allows weight 0 for bodyweight moves and decimal weights', () => {
    expect(validateSet(set('Pull-up', 0, 8)).ok).toBe(true);
    expect(validateSet(set('Curl', '22.5', 10)).set.weight).toBe(22.5);
  });

  it('R1.2: rejects negative, missing, or non-numeric weight', () => {
    for (const w of [-5, '', 'heavy', undefined, NaN]) {
      const r = validateSet(set('Squat', w, 5));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/weight/i);
    }
  });

  it('R1.2: rejects reps that are zero, negative, fractional, or not numbers', () => {
    for (const reps of [0, -1, 2.5, '', 'ten', undefined]) {
      const r = validateSet(set('Squat', 100, reps));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/reps/i);
    }
  });

  it('R1.2: invalid input adds nothing to the draft', () => {
    const state = createInitialState();
    const r = addSet(state, set('Squat', -1, 5));
    expect(r.ok).toBe(false);
    expect(r.state.draft.sets).toHaveLength(0);
  });

  it('R1.3: names match ignoring case and repeated spaces', () => {
    expect(normalizeName('  Bench   Press ')).toBe(normalizeName('bench press'));
  });

  it('R1.3: keeps the first typed name for display', () => {
    let state = createInitialState();
    state = addSet(state, set('Bench Press', 100, 5)).state;
    state = completeWorkout(state).state;
    state = addSet(state, set('bench  press', 110, 5)).state;
    state = completeWorkout(state).state;
    expect(state.bests[normalizeName('bench press')].name).toBe('Bench Press');
    expect(exerciseSuggestions(state)).toEqual(['Bench Press']);
  });

  it('R1.4: adds sets to the draft in order without mutating the old state', () => {
    const s0 = createInitialState();
    const s1 = addSet(s0, set('Squat', 100, 5)).state;
    const s2 = addSet(s1, set('Row', 80, 8)).state;
    expect(s0.draft.sets).toHaveLength(0);
    expect(s2.draft.sets.map((x) => x.exercise)).toEqual(['Squat', 'Row']);
  });

  it('R1.4: removes a set from the draft by index', () => {
    let s = createInitialState();
    s = addSet(s, set('Squat', 100, 5)).state;
    s = addSet(s, set('Row', 80, 8)).state;
    s = removeSet(s, 0);
    expect(s.draft.sets.map((x) => x.exercise)).toEqual(['Row']);
    expect(removeSet(s, 9).draft.sets).toHaveLength(1);
  });

  it('R1.5: a workout with no sets cannot be completed', () => {
    const s = createInitialState();
    const r = completeWorkout(s);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/set/i);
    expect(r.state).toBe(s);
  });

  it('R1.6: suggestions list each used exercise once, sorted', () => {
    let s = createInitialState();
    for (const [e, w] of [['Squat', 100], ['Bench Press', 80], ['squat', 105]]) {
      s = addSet(s, set(e, w, 5)).state;
    }
    s = completeWorkout(s).state;
    expect(exerciseSuggestions(s)).toEqual(['Bench Press', 'Squat']);
  });
});
