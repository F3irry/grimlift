// Body-weight history (spec R10).
import { toNumber } from './entries.js';
import { toKg, fromKg, roundTenth } from './units.js';

export const MAX_BODY_KG = 700;

/** R10.1: a body weight entered in `unit`, returned in kg. */
export function validateBodyWeight(value, unit) {
  const n = toNumber(value);
  const max = roundTenth(fromKg(MAX_BODY_KG, unit));
  if (!Number.isFinite(n) || n <= 0 || toKg(n, unit) > MAX_BODY_KG + 1e-9) {
    return { ok: false, error: `Body weight must be a number above 0 and at most ${max} ${unit}.` };
  }
  return { ok: true, kg: toKg(n, unit) };
}

export function newWeighIn(kg, now) {
  return { id: `w${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`, at: now.toISOString(), kg };
}

/** R10.1: save a weigh-in entered in the profile's preferred unit. */
export function addWeighIn(profile, value, now = new Date()) {
  const v = validateBodyWeight(value, profile.unit);
  if (!v.ok) return { ok: false, profile, error: v.error };
  const weighIn = newWeighIn(v.kg, now);
  return { ok: true, profile: { ...profile, weighIns: [...profile.weighIns, weighIn] }, weighIn };
}

/** R10.2 */
export function deleteWeighIn(profile, id) {
  return { ...profile, weighIns: profile.weighIns.filter((w) => w.id !== id) };
}

/** R10.2: the most recent weigh-in in kg, or null. */
export function currentBodyWeightKg(profile) {
  const list = profile.weighIns;
  return list.length ? list[list.length - 1].kg : null;
}

/** R10.2: newest first. */
export function weighInHistory(profile) {
  return [...profile.weighIns].reverse();
}
