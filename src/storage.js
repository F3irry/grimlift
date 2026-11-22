// Browser persistence (spec R4). Takes a Storage-like object so tests can fake it.
import { createApp } from './logic/profiles.js';
import { UNITS } from './logic/units.js';

export const STORAGE_KEY = 'grimlift:v2';
/** R4.4: round-1 key. It is never read. */
export const LEGACY_KEY = 'grimlift:v1';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isPosInt = (v) => Number.isInteger(v) && v >= 1;

const isEntry = (e) =>
  isObj(e) &&
  isStr(e.id) &&
  isStr(e.loggedAt) &&
  isStr(e.exercise) &&
  isPosInt(e.sets) &&
  isPosInt(e.reps) &&
  Number.isFinite(e.weight) &&
  e.weight >= 0 &&
  UNITS.includes(e.unit);

const isProfile = (p) =>
  isObj(p) &&
  isStr(p.id) &&
  isStr(p.name) &&
  UNITS.includes(p.unit) &&
  (p.bodyWeightKg === null || (Number.isFinite(p.bodyWeightKg) && p.bodyWeightKg > 0)) &&
  isStr(p.goal) &&
  Array.isArray(p.entries) &&
  p.entries.every(isEntry);

/** R4.3: accept only data shaped like a v2 app. */
export function isValidApp(a) {
  return (
    isObj(a) &&
    a.version === 2 &&
    Array.isArray(a.profiles) &&
    a.profiles.every(isProfile) &&
    (a.activeProfileId === null || a.profiles.some((p) => p.id === a.activeProfileId))
  );
}

/** R4.2, R4.3 */
export function loadApp(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return createApp();
    const parsed = JSON.parse(raw);
    return isValidApp(parsed) ? parsed : createApp();
  } catch {
    return createApp();
  }
}

/** R4.1: returns true if the write succeeded. */
export function saveApp(storage, app) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(app));
    return true;
  } catch {
    return false;
  }
}
