import { describe, it, expect } from 'vitest';
import {
  createApp,
  createProfile,
  updateProfile,
  switchProfile,
  deleteProfile,
  activeProfile,
  replaceProfile,
  profileStats,
} from '../src/logic/profiles.js';
import { logEntry } from '../src/logic/progression.js';

const NOW = new Date('2026-11-22T10:00:00Z');

function withProfiles(...names) {
  let app = createApp();
  for (const name of names) {
    const r = createProfile(app, { name }, NOW);
    expect(r.ok).toBe(true);
    app = r.app;
  }
  return app;
}

function log(app, input) {
  const r = logEntry(activeProfile(app), { sets: 1, reps: 5, unit: 'kg', ...input }, NOW);
  expect(r.ok).toBe(true);
  return replaceProfile(app, r.profile);
}

describe('R8 profiles', () => {
  it('R8.1: a new app has no profiles and no active profile', () => {
    const app = createApp();
    expect(app.profiles).toEqual([]);
    expect(activeProfile(app)).toBeNull();
  });

  it('R8.1: creating a profile makes it active', () => {
    const app = withProfiles('Ash');
    expect(activeProfile(app).name).toBe('Ash');
  });

  it('R8.2: defaults are kg, no body weight, empty goal, no entries', () => {
    const p = activeProfile(withProfiles('Ash'));
    expect(p).toMatchObject({ name: 'Ash', unit: 'kg', bodyWeightKg: null, goal: '', entries: [] });
    expect(typeof p.id).toBe('string');
  });

  it('R8.2: stores body weight in kg from the preferred unit', () => {
    const r = createProfile(createApp(), { name: 'Ash', unit: 'lb', bodyWeight: '200', goal: '  Bench 225  ' }, NOW);
    expect(r.profile.unit).toBe('lb');
    expect(r.profile.bodyWeightKg).toBeCloseTo(90.718474, 6);
    expect(r.profile.goal).toBe('Bench 225');
  });

  it('R8.2: rejects a blank, too long, or duplicate name', () => {
    const app = withProfiles('Ash');
    for (const name of ['', '   ', 'x'.repeat(41), 'ash', '  ASH ']) {
      const r = createProfile(app, { name }, NOW);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/name/i);
      expect(r.app).toBe(app);
    }
    expect(createProfile(app, { name: 'x'.repeat(40) }, NOW).ok).toBe(true);
  });

  it('R8.2: rejects a bad unit, body weight, or overlong goal', () => {
    const app = createApp();
    expect(createProfile(app, { name: 'A', unit: 'stone' }, NOW).error).toMatch(/unit/i);
    for (const bodyWeight of ['0', '-70', 'big']) {
      expect(createProfile(app, { name: 'A', bodyWeight }, NOW).error).toMatch(/body weight/i);
    }
    expect(createProfile(app, { name: 'A', goal: 'g'.repeat(141) }, NOW).error).toMatch(/goal/i);
    expect(createProfile(app, { name: 'A', bodyWeight: '' }, NOW).profile.bodyWeightKg).toBeNull();
  });

  it('R8.3: switching changes the active profile', () => {
    let app = withProfiles('Ash', 'Bryn');
    expect(activeProfile(app).name).toBe('Bryn');
    app = switchProfile(app, app.profiles[0].id);
    expect(activeProfile(app).name).toBe('Ash');
    expect(switchProfile(app, 'nope')).toBe(app);
  });

  it('R8.3: entries, XP, and records never mix between profiles', () => {
    let app = withProfiles('Ash', 'Bryn');
    const [ash, bryn] = app.profiles;
    app = switchProfile(app, ash.id);
    app = log(app, { exercise: 'Squat', weight: 100 });
    app = log(app, { exercise: 'Squat', weight: 110 });
    app = switchProfile(app, bryn.id);
    app = log(app, { exercise: 'Squat', weight: 60 });

    const a = profileStats(app.profiles[0]);
    const b = profileStats(app.profiles[1]);
    expect(a.entryCount).toBe(2);
    expect(a.level).toBe(2);
    expect(b.entryCount).toBe(1);
    expect(b.level).toBe(1);
    expect(b.records[0].display).toBe('60 kg × 5');
  });

  it('R8.4: editing keeps entries and validates like creation', () => {
    let app = withProfiles('Ash', 'Bryn');
    app = log(app, { exercise: 'Row', weight: 50 });
    const id = activeProfile(app).id;
    const r = updateProfile(app, id, { name: 'Bryn R', unit: 'lb', bodyWeight: '150', goal: 'Row 200' });
    expect(r.ok).toBe(true);
    expect(activeProfile(r.app)).toMatchObject({ name: 'Bryn R', unit: 'lb', goal: 'Row 200' });
    expect(activeProfile(r.app).entries).toHaveLength(1);
    // Keeping your own name is fine; taking another profile's is not.
    expect(updateProfile(r.app, id, { name: 'bryn r' }).ok).toBe(true);
    expect(updateProfile(r.app, id, { name: 'ASH' }).error).toMatch(/name/i);
  });

  it('R8.4 / R3.5: stats summary shows level, XP, counts, and records in the preferred unit', () => {
    let app = withProfiles('Ash');
    app = log(app, { exercise: 'Squat', sets: 3, weight: 100 });
    app = log(app, { exercise: 'Bench', sets: 2, weight: 135, unit: 'lb' });
    app = updateProfile(app, activeProfile(app).id, { name: 'Ash', unit: 'lb' }).app;
    const s = profileStats(activeProfile(app));
    expect(s).toMatchObject({ level: 1, totalXp: 65, entryCount: 2, totalSets: 5 });
    expect(s.xp).toEqual({ current: 65, needed: 100 });
    expect(s.records.map((r) => r.display)).toEqual(['135 lb × 5', '220.5 lb × 5']);
    expect(s.records.map((r) => r.name)).toEqual(['Bench', 'Squat']);
  });

  it('R8.5: deleting the active profile switches to another', () => {
    let app = withProfiles('Ash', 'Bryn');
    app = deleteProfile(app, activeProfile(app).id);
    expect(app.profiles.map((p) => p.name)).toEqual(['Ash']);
    expect(activeProfile(app).name).toBe('Ash');
  });

  it('R8.5: deleting the last profile leaves none active', () => {
    let app = withProfiles('Ash');
    app = deleteProfile(app, activeProfile(app).id);
    expect(app.profiles).toEqual([]);
    expect(activeProfile(app)).toBeNull();
  });

  it('R8.5: deleting an inactive profile keeps the active one', () => {
    let app = withProfiles('Ash', 'Bryn');
    app = deleteProfile(app, app.profiles[0].id);
    expect(activeProfile(app).name).toBe('Bryn');
  });
});
