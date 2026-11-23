// Browser persistence (spec R4). Takes a Storage-like object so tests can fake it.
import { createApp } from './logic/profiles.js';
import { UNITS } from './logic/units.js';
import { newWeighIn } from './logic/bodyweight.js';
import { MAX_NOTE } from './logic/goals.js';
import { AREAS, EQUIPMENT, EXPERIENCE } from './logic/limitations.js';

export const STORAGE_KEY = 'grimlift:v4';
/** R4.6: round-3/4 key, migrated on load when there is no v4 data. */
export const V3_KEY = 'grimlift:v3';
/** R4.5: round-2 key, migrated on load when there is neither v4 nor v3 data. */
export const V2_KEY = 'grimlift:v2';
/** R4.4: round-1 key. It is never read. */
export const LEGACY_KEY = 'grimlift:v1';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isPosInt = (v) => Number.isInteger(v) && v >= 1;
const isPosNum = (v) => Number.isFinite(v) && v > 0;
const isDays = (v) => Number.isInteger(v) && v >= 1 && v <= 7;
const isDayKey = (v) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

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

const isWeighIn = (w) => isObj(w) && isStr(w.id) && isStr(w.at) && isPosNum(w.kg);

function isGoal(g) {
  if (!isObj(g) || !isStr(g.id) || !isStr(g.createdAt)) return false;
  switch (g.type) {
    case 'lift':
      return isStr(g.exercise) && isPosNum(g.targetWeight) && UNITS.includes(g.unit) &&
        isPosInt(g.targetReps) && Number.isFinite(g.baselineKg) && g.baselineKg >= 0;
    case 'bodyweight':
      return isPosNum(g.targetKg) && isPosNum(g.startKg);
    case 'training':
      return isDays(g.daysPerWeek);
    case 'habit':
      return isStr(g.name) && isDays(g.daysPerWeek) && Array.isArray(g.checks) && g.checks.every(isDayKey);
    default:
      return false;
  }
}

const isLimitation = (l) =>
  isObj(l) &&
  isStr(l.at) &&
  Array.isArray(l.areas) &&
  l.areas.every((a) => AREAS.includes(a)) &&
  new Set(l.areas).size === l.areas.length &&
  EQUIPMENT.includes(l.equipment) &&
  EXPERIENCE.includes(l.experience);

const isV3Profile = (p) =>
  isObj(p) &&
  isStr(p.id) &&
  isStr(p.name) &&
  UNITS.includes(p.unit) &&
  Array.isArray(p.entries) &&
  p.entries.every(isEntry) &&
  Array.isArray(p.weighIns) &&
  p.weighIns.every(isWeighIn) &&
  Array.isArray(p.goals) &&
  p.goals.every(isGoal) &&
  isStr(p.goalNote);

const hasValidActive = (a) =>
  a.activeProfileId === null || a.profiles.some((p) => p.id === a.activeProfileId);

const isProfile = (p) => isV3Profile(p) && Array.isArray(p.limitations) && p.limitations.every(isLimitation);

/** R4.3: accept only data shaped like a v4 app. */
export function isValidApp(a) {
  return isObj(a) && a.version === 4 && Array.isArray(a.profiles) && a.profiles.every(isProfile) && hasValidActive(a);
}

function isValidV3(a) {
  return isObj(a) && a.version === 3 && Array.isArray(a.profiles) && a.profiles.every(isV3Profile) && hasValidActive(a);
}

/** R4.6: turn round-3/4 data into round-5 data. */
export function migrateV3(v3) {
  return { ...v3, version: 4, profiles: v3.profiles.map((p) => ({ ...p, limitations: [] })) };
}

const isV2Profile = (p) =>
  isObj(p) &&
  isStr(p.id) &&
  isStr(p.name) &&
  UNITS.includes(p.unit) &&
  (p.bodyWeightKg === null || isPosNum(p.bodyWeightKg)) &&
  isStr(p.goal) &&
  Array.isArray(p.entries) &&
  p.entries.every(isEntry);

function isValidV2(a) {
  return isObj(a) && a.version === 2 && Array.isArray(a.profiles) && a.profiles.every(isV2Profile) && hasValidActive(a);
}

/** R4.5: turn round-2 data into round-3 data. */
export function migrateV2(v2, now = new Date()) {
  return {
    version: 3,
    activeProfileId: v2.activeProfileId,
    profiles: v2.profiles.map(({ bodyWeightKg, goal, ...rest }) => ({
      ...rest,
      weighIns: bodyWeightKg == null ? [] : [newWeighIn(bodyWeightKg, now)],
      goals: [],
      goalNote: goal.trim().slice(0, MAX_NOTE),
    })),
  };
}

function readJson(storage, key) {
  const raw = storage.getItem(key);
  return raw == null ? undefined : JSON.parse(raw);
}

/** R4.2, R4.3, R4.5, R4.6 */
export function loadApp(storage, now = new Date()) {
  try {
    const v4 = readJson(storage, STORAGE_KEY);
    if (v4 !== undefined) return isValidApp(v4) ? v4 : createApp();
    const v3 = readJson(storage, V3_KEY);
    if (v3 !== undefined) {
      const migrated = isValidV3(v3) ? migrateV3(v3) : null;
      return migrated && isValidApp(migrated) ? migrated : createApp();
    }
    const v2 = readJson(storage, V2_KEY);
    if (v2 !== undefined && isValidV2(v2)) {
      const migrated = migrateV3(migrateV2(v2, now));
      if (isValidApp(migrated)) return migrated;
    }
    return createApp();
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
