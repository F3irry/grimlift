import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, LEGACY_KEY, loadApp, saveApp } from '../src/storage.js';
import { createApp, createProfile, activeProfile, replaceProfile, profileStats } from '../src/logic/profiles.js';
import { logEntry } from '../src/logic/progression.js';

/** Minimal stand-in for window.localStorage. */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: data,
  };
}

function sampleApp() {
  const now = new Date('2026-11-21T09:00:00Z');
  let app = createProfile(createApp(), { name: 'Ash', unit: 'lb', bodyWeight: '180', goal: 'Squat 315' }, now).app;
  app = createProfile(app, { name: 'Bryn' }, now).app;
  app = { ...app, activeProfileId: app.profiles[0].id };
  for (const weight of [225, 245]) {
    const r = logEntry(activeProfile(app), { exercise: 'Squat', sets: 3, reps: 5, weight, unit: 'lb' }, now);
    app = replaceProfile(app, r.profile);
  }
  return app;
}

describe('R4 persistence', () => {
  it('R4.1: saving writes JSON under the v2 key', () => {
    const storage = fakeStorage();
    expect(saveApp(storage, sampleApp())).toBe(true);
    expect(JSON.parse(storage.raw.get(STORAGE_KEY)).profiles).toHaveLength(2);
  });

  it('R4.1 / R4.2: profiles, entries, and the active profile survive a reload', () => {
    const storage = fakeStorage();
    const before = sampleApp();
    saveApp(storage, before);
    const after = loadApp(storage);
    expect(after).toEqual(before);
    expect(activeProfile(after).name).toBe('Ash');
    const stats = profileStats(activeProfile(after));
    expect(stats.entryCount).toBe(2);
    expect(stats.totalXp).toBe(70);
    expect(stats.level).toBe(2);
  });

  it('R4.3: no saved data gives a fresh app with no profiles', () => {
    expect(loadApp(fakeStorage())).toEqual(createApp());
  });

  it('R4.3: unreadable or wrong-shaped data gives a fresh app', () => {
    const bad = [
      '{not json', 'null', '42', '[]', '{"profiles":"x"}',
      '{"version":2,"activeProfileId":null,"profiles":[{"id":"a","name":"A"}]}',
      JSON.stringify({ ...sampleApp(), activeProfileId: 'missing' }),
    ];
    for (const raw of bad) {
      expect(loadApp(fakeStorage({ [STORAGE_KEY]: raw }))).toEqual(createApp());
    }
  });

  it('R4.3: storage that throws does not crash load or save', () => {
    const broken = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    expect(loadApp(broken)).toEqual(createApp());
    expect(saveApp(broken, sampleApp())).toBe(false);
  });

  it('R4.4: round-1 data is not loaded', () => {
    const v1 = JSON.stringify({ workouts: [{ sets: [] }], totalXp: 300, pbLevels: 2, bests: {}, draft: { sets: [] } });
    expect(LEGACY_KEY).toBe('grimlift:v1');
    expect(loadApp(fakeStorage({ [LEGACY_KEY]: v1 }))).toEqual(createApp());
  });
});
