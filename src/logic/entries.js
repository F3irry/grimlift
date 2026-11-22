// Entry validation and exercise names (spec R1).
import { UNITS } from './units.js';

export const MAX_SETS = 50;
export const MAX_REPS = 1000;

const cleanName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

/** R1.3: key used to match exercise names regardless of case and spacing. */
export function normalizeName(name) {
  return cleanName(name).toLowerCase();
}

/** Parse form input as a number; blank or missing becomes NaN. */
export function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return Number(value);
}

const wholeInRange = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

/** R1.1, R1.2: check raw form input; returns { ok, entry } or { ok: false, error }. */
export function validateEntry({ exercise, sets, reps, weight, unit } = {}) {
  const name = cleanName(exercise);
  if (!name) return { ok: false, error: 'Name the exercise.' };

  const s = toNumber(sets);
  if (!wholeInRange(s, 1, MAX_SETS)) {
    return { ok: false, error: `Sets must be a whole number from 1 to ${MAX_SETS}.` };
  }

  const r = toNumber(reps);
  if (!wholeInRange(r, 1, MAX_REPS)) {
    return { ok: false, error: `Reps must be a whole number from 1 to ${MAX_REPS}.` };
  }

  const w = toNumber(weight);
  if (!Number.isFinite(w) || w < 0) {
    return { ok: false, error: 'Weight must be a number of 0 or more.' };
  }

  if (!UNITS.includes(unit)) return { ok: false, error: 'Pick a unit: kg or lb.' };

  return { ok: true, entry: { exercise: name, sets: s, reps: r, weight: w, unit } };
}

/** R1.5: display names (first typed) of every exercise used, sorted. */
export function exerciseSuggestions(entries) {
  const byKey = new Map();
  for (const e of entries) {
    const key = normalizeName(e.exercise);
    if (!byKey.has(key)) byKey.set(key, e.exercise);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
