// Limitations (spec R13.1): body areas to protect, equipment, experience.
// Stored as a dated history so a past week keeps the limitations in force then.
import { weekKey, parseDayKey } from './dates.js';

export const AREAS = ['knees', 'hips', 'lowerBack', 'shoulders', 'elbows', 'wrists'];
export const AREA_LABELS = {
  knees: 'knees',
  hips: 'hips',
  lowerBack: 'lower back',
  shoulders: 'shoulders',
  elbows: 'elbows',
  wrists: 'wrists',
};
/** Each level includes the ones before it. */
export const EQUIPMENT = ['bodyweight', 'dumbbells', 'gym'];
export const EQUIPMENT_LABELS = { bodyweight: 'bodyweight only', dumbbells: 'dumbbells', gym: 'a full gym' };
export const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
export const DEFAULT_LIMITATIONS = Object.freeze({ areas: [], equipment: 'gym', experience: 'beginner' });

const strip = ({ areas, equipment, experience }) => ({ areas: [...areas], equipment, experience });

/** R13.1: validate raw input. `areas` may be an array or a single string. */
export function validateLimitations(input = {}) {
  const raw = input.areas == null ? [] : [].concat(input.areas);
  if (raw.some((a) => !AREAS.includes(a))) return { ok: false, error: 'Pick body areas from the list.' };
  if (!EQUIPMENT.includes(input.equipment)) return { ok: false, error: 'Pick the equipment you have.' };
  if (!EXPERIENCE.includes(input.experience)) return { ok: false, error: 'Pick your experience level.' };
  const areas = AREAS.filter((a) => raw.includes(a)); // fixed order, no duplicates
  return { ok: true, limitations: { areas, equipment: input.equipment, experience: input.experience } };
}

/** R13.1: save limitations; a save in the same week as the latest record replaces it. */
export function setLimitations(profile, input, now = new Date()) {
  const v = validateLimitations(input);
  if (!v.ok) return { ok: false, profile, error: v.error };
  const record = { at: now.toISOString(), ...v.limitations };
  const list = profile.limitations;
  const last = list[list.length - 1];
  const sameWeek = last && weekKey(new Date(last.at)) === weekKey(now);
  const limitations = sameWeek ? [...list.slice(0, -1), record] : [...list, record];
  return { ok: true, profile: { ...profile, limitations } };
}

/** R13.1: the latest record, or the defaults. */
export function currentLimitations(profile) {
  const last = profile.limitations[profile.limitations.length - 1];
  return strip(last ?? DEFAULT_LIMITATIONS);
}

/** R13.1: the latest record saved before the week `week` (a Monday key) ended. */
export function limitationsForWeek(profile, week) {
  const end = parseDayKey(week);
  end.setDate(end.getDate() + 7);
  let found = DEFAULT_LIMITATIONS;
  for (const r of profile.limitations) if (new Date(r.at) < end) found = r;
  return strip(found);
}

/** True when `limits` include the `needed` equipment level. */
export function hasEquipment(limits, needed) {
  return EQUIPMENT.indexOf(needed) <= EQUIPMENT.indexOf(limits.equipment);
}
