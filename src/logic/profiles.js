// Local profiles (spec R8, R9). The app holds several profiles; one is active.
import { UNITS, formatWeight } from './units.js';
import { summarize, xpProgress, profileLevel } from './progression.js';
import { validateBodyWeight, newWeighIn, currentBodyWeightKg } from './bodyweight.js';
import { streakStatus } from './streaks.js';

export const MAX_NAME = 40;
export { profileLevel };

/** R8.1: an app with no profiles. */
export function createApp() {
  return { version: 5, activeProfileId: null, profiles: [] };
}

export function activeProfile(app) {
  return app.profiles.find((p) => p.id === app.activeProfileId) ?? null;
}

/** Put an updated copy of a profile back into the app (matched by id). */
export function replaceProfile(app, profile) {
  return { ...app, profiles: app.profiles.map((p) => (p.id === profile.id ? profile : p)) };
}

/** R8.2, R9.1: validate name and preferred unit. */
function validateAccount(app, input, selfId) {
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Give the profile a name.' };
  if (name.length > MAX_NAME) return { ok: false, error: `Name must be ${MAX_NAME} characters or fewer.` };
  const taken = app.profiles.some((p) => p.id !== selfId && p.name.toLowerCase() === name.toLowerCase());
  if (taken) return { ok: false, error: 'That name is already used by another profile.' };
  const unit = input.unit ?? 'kg';
  if (!UNITS.includes(unit)) return { ok: false, error: 'Preferred unit must be kg or lb.' };
  return { ok: true, name, unit };
}

/** R8.1, R8.2: add a profile and make it active. An optional body weight becomes the first weigh-in. */
export function createProfile(app, input, now = new Date()) {
  const fail = (error) => ({ ok: false, app, error });
  const v = validateAccount(app, input, null);
  if (!v.ok) return fail(v.error);

  const weighIns = [];
  const bw = input.bodyWeight;
  if (bw !== undefined && bw !== null && String(bw).trim() !== '') {
    const b = validateBodyWeight(bw, v.unit);
    if (!b.ok) return fail(b.error);
    weighIns.push(newWeighIn(b.kg, now));
  }

  const profile = {
    id: `p${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    name: v.name,
    unit: v.unit,
    entries: [],
    weighIns,
    goals: [],
    goalNote: '',
    limitations: [], // R13.1: defaults until the user saves some
  };
  return {
    ok: true,
    app: { ...app, profiles: [...app.profiles, profile], activeProfileId: profile.id },
    profile,
  };
}

/** R9.1: change name and preferred unit; nothing else is touched. */
export function updateAccount(app, id, input) {
  const current = app.profiles.find((p) => p.id === id);
  if (!current) return { ok: false, app, error: 'Profile not found.' };
  const v = validateAccount(app, input, id);
  if (!v.ok) return { ok: false, app, error: v.error };
  const profile = { ...current, name: v.name, unit: v.unit };
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

/** R8.4: summary for the profile page; weights in the preferred unit (R3.5, R9.2). */
export function profileStats(profile, now = new Date()) {
  const s = summarize(profile.entries);
  const lvl = profileLevel(profile, now);
  const bw = currentBodyWeightKg(profile);
  const streak = streakStatus(profile.entries, now); // R12.1
  const records = Object.values(s.bests)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => ({
      name: b.name,
      kg: b.kg,
      reps: b.reps,
      display: `${formatWeight(b.kg, profile.unit)} × ${b.reps}`,
    }));
  return {
    level: lvl.level,
    totalXp: lvl.totalXp,
    pbLevels: lvl.pbLevels,
    goalLevels: lvl.goalLevels,
    xp: xpProgress(lvl.totalXp),
    entryCount: profile.entries.length,
    totalSets: profile.entries.reduce((n, e) => n + e.sets, 0),
    bodyWeight: bw == null ? null : formatWeight(bw, profile.unit),
    goalsReached: lvl.goalLevels,
    goalCount: profile.goals.length,
    streak: streak.current,
    bestStreak: streak.best,
    streakBroken: streak.broken,
    lostWeeks: streak.lostWeeks,
    records,
  };
}
