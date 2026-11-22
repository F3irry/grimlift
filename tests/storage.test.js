import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, loadState, saveState } from '../src/storage.js';
import { addSet } from '../src/logic/workout.js';
import { createInitialState, completeWorkout, levelOf } from '../src/logic/progression.js';

/** Minimal stand-in for window.localStorage. */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    raw: data,
  };
}

function sampleState() {
  let s = createInitialState();
  s = addSet(s, { exercise: 'Squat', weight: 100, reps: 5 }).state;
  s = completeWorkout(s, new Date('2026-11-20T09:00:00Z')).state;
  s = addSet(s, { exercise: 'Squat', weight: 110, reps: 5 }).state;
  s = completeWorkout(s, new Date('2026-11-21T09:00:00Z')).state;
  s = addSet(s, { exercise: 'Row', weight: 60, reps: 10 }).state; // unfinished draft
  return s;
}

describe('R4 persistence', () => {
  it('R4.1: saving writes JSON under the storage key', () => {
    const storage = fakeStorage();
    saveState(storage, sampleState());
    expect(JSON.parse(storage.raw.get(STORAGE_KEY)).workouts).toHaveLength(2);
  });

  it('R4.1 / R4.2: workouts, XP, level, bests, and draft survive a reload', () => {
    const storage = fakeStorage();
    const before = sampleState();
    saveState(storage, before);
    const after = loadState(storage);
    expect(after).toEqual(before);
    expect(after.totalXp).toBe(50);
    expect(levelOf(after)).toBe(2);
    expect(after.draft.sets).toHaveLength(1);
  });

  it('R4.3: no saved data gives a fresh state', () => {
    const s = loadState(fakeStorage());
    expect(s).toEqual(createInitialState());
    expect(levelOf(s)).toBe(1);
  });

  it('R4.3: unreadable JSON gives a fresh state', () => {
    expect(loadState(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual(createInitialState());
  });

  it('R4.3: wrong-shaped data gives a fresh state', () => {
    for (const bad of ['null', '42', '[]', '{"workouts":"x"}', '{"workouts":[],"totalXp":-1}']) {
      expect(loadState(fakeStorage({ [STORAGE_KEY]: bad }))).toEqual(createInitialState());
    }
  });

  it('R4.3: storage that throws does not crash load or save', () => {
    const broken = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    expect(loadState(broken)).toEqual(createInitialState());
    expect(() => saveState(broken, sampleState())).not.toThrow();
  });
});
