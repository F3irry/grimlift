// Local profiles (spec R8). The app holds several profiles; one is active.
import { UNITS, toKg, formatWeight } from './units.js';
import { toNumber } from './entries.js';
import { summarize, xpProgress } from './progression.js';

export const MAX_NAME = 40;
export const MAX_GOAL = 140;

/** R8.1: an app with no profiles. */
export function createApp() {
  return { version: 2, activeProfileId: null, profiles: [] };
}

export function activeProfile(app) {
  return app.profiles.find((p) => p.id === app.activeProfileId) ?? null;
}

/** Put an updated copy of a profile back into the app (matched by id). */
export function replaceProfile(app, profile) {
  return { ...app, profiles: app.profiles.map((p) => (p.id === profile.id ? profile : p)) };
}

/**
 * R8.2: validate profile details. Fields missing from `input` keep the values
 * in `current`. Body weight is given in the (new) preferred unit.
 */
function validateDetails(app, input, current, selfId) {
  const name = String(input.name ?? current.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Give the profile a name.' };
  if (name.length > MAX_NAME) return { ok: false, error: `Name must be ${MAX_NAME} characters or fewer.` };
  const taken = app.profiles.some(
    (p) => p.id !== selfId && p.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) return { ok: false, error: 'That name is already used by another profile.' };

  const unit = input.unit ?? current.unit ?? 'kg';
  if (!UNITS.includes(unit)) return { ok: false, error: 'Preferred unit must be kg or lb.' };

  let bodyWeightKg = current.bodyWeightKg ?? null;
  if (input.bodyWeight !== undefined) {
    const blank = input.bodyWeight === null || String(input.bodyWeight).trim() === '';
    if (blank) {
      bodyWeightKg = null;
    } else {
      const bw = toNumber(input.bodyWeight);
      if (!Number.isFinite(bw) || bw <= 0) {
        return { ok: false, error: 'Body weight must be a number above 0, or left blank.' };
      }
      bodyWeightKg = toKg(bw, unit);
    }
  }

  const goal = String(input.goal ?? current.goal ?? '').trim();
  if (goal.length > MAX_GOAL) return { ok: false, error: `Goal must be ${MAX_GOAL} characters or fewer.` };

  return { ok: true, details: { name, unit, bodyWeightKg, goal } };
}

/** R8.1, R8.2: add a profile and make it active. */
export function createProfile(app, input, now = new Date()) {
  const v = validateDetails(app, input, {}, null);
  if (!v.ok) return { ok: false, app, error: v.error };
  const profile = {
    id: `p${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    ...v.details,
    entries: [],
  };
  return {
    ok: true,
    app: { ...app, profiles: [...app.profiles, profile], activeProfileId: profile.id },
    profile,
  };
}

/** R8.4: edit details of an existing profile; entries are untouched. */
export function updateProfile(app, id, input) {
  const current = app.profiles.find((p) => p.id === id);
  if (!current) return { ok: false, app, error: 'Profile not found.' };
  const v = validateDetails(app, input, current, id);
  if (!v.ok) return { ok: false, app, error: v.error };
  const profile = { ...current, ...v.details };
  return { ok: true, app: replaceProfile(app, profile), profile };
}

/** R8.3: unknown ids leave the app unchanged. */
export function switchProfile(app, id) {
  if (!app.profiles.some((p) => p.id === id)) return app;
  return { ...app, activeProfileId: id };
}

/** R8.5: remove a profile and its data; pick another active profile if needed. */
export function deleteProfile(app, id) {
  const profiles = app.profiles.filter((p) => p.id !== id);
  let activeProfileId = app.activeProfileId;
  if (activeProfileId === id) activeProfileId = profiles.length ? profiles[0].id : null;
  return { ...app, profiles, activeProfileId };
}

/** R8.4: summary for the profile page; records in the preferred unit (R3.5). */
export function profileStats(profile) {
  const s = summarize(profile.entries);
  const records = Object.values(s.bests)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => ({
      name: b.name,
      kg: b.kg,
      reps: b.reps,
      display: `${formatWeight(b.kg, profile.unit)} × ${b.reps}`,
    }));
  return {
    level: s.level,
    totalXp: s.totalXp,
    pbLevels: s.pbLevels,
    xp: xpProgress(s.totalXp),
    entryCount: profile.entries.length,
    totalSets: profile.entries.reduce((n, e) => n + e.sets, 0),
    records,
  };
}
