// Browser persistence (spec R4). Takes a Storage-like object so tests can fake it.
import { createInitialState } from './logic/progression.js';

export const STORAGE_KEY = 'grimlift:v1';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isSet = (s) =>
  isObj(s) && typeof s.exercise === 'string' && Number.isFinite(s.weight) && isCount(s.reps);

/** R4.3: accept only data shaped like a game state. */
export function isValidState(s) {
  return (
    isObj(s) &&
    Array.isArray(s.workouts) &&
    s.workouts.every((w) => isObj(w) && Array.isArray(w.sets) && w.sets.every(isSet)) &&
    isCount(s.totalXp) &&
    isCount(s.pbLevels) &&
    isObj(s.bests) &&
    Object.values(s.bests).every(
      (b) => isObj(b) && typeof b.name === 'string' && Number.isFinite(b.weight) && isCount(b.reps),
    ) &&
    isObj(s.draft) &&
    Array.isArray(s.draft.sets) &&
    s.draft.sets.every(isSet)
  );
}

/** R4.2, R4.3 */
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return createInitialState();
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}

/** R4.1: returns true if the write succeeded. */
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
