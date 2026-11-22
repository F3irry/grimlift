import { describe, it, expect } from 'vitest';
import {
  createApp,
  createProfile,
  updateAccount,
  switchProfile,
  deleteProfile,
  activeProfile,
  replaceProfile,
  profileStats,
  profileLevel,
} from '../src/logic/profiles.js';
import { logEntry } from '../src/logic/progression.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { addGoal } from '../src/logic/goals.js';
import { at } from './helpers.js';

const NOW = at(23, 8);

function withProfiles(...names) {
  let app = createApp();
  for (const name of names) {
    const r = createProfile(app, { name }, NOW);
    expect(r.ok).toBe(true);
    app = r.app;
  }
  return app;
}

function log(app, input, now = at(23, 10)) {
  const r = logEntry(activeProfile(app), { sets: 1, reps: 5, unit: 'kg', ...input }, now);
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
    expect(activeProfile(withProfiles('Ash')).name).toBe('Ash');
  });

  it('R8.2: a new profile has kg, no weigh-ins, no goals, an empty note, no entries', () => {
    const p = activeProfile(withProfiles('Ash'));
    expect(p).toEqual({
      id: expect.any(String), createdAt: NOW.toISOString(), name: 'Ash', unit: 'kg',
      entries: [], weighIns: [], goals: [], goalNote: '',
    });
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

  it('R8.2: rejects a bad unit or starting body weight', () => {
    const app = createApp();
    expect(createProfile(app, { name: 'A', unit: 'stone' }, NOW).error).toMatch(/unit/i);
    for (const bodyWeight of ['0', '-70', 'big']) {
      expect(createProfile(app, { name: 'A', bodyWeight }, NOW).error).toMatch(/body weight/i);
    }
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

  it('R8.4 / R3.5: stats show level, XP, counts, body weight, goals reached, and records', () => {
    let app = withProfiles('Ash');
    let p = addWeighIn(activeProfile(app), '90', at(23, 9)).profile;
    p = addGoal(p, { type: 'training', daysPerWeek: 1 }, at(23, 9)).profile;
    app = replaceProfile(app, p);
    app = log(app, { exercise: 'Squat', sets: 3, weight: 100 });
    app = log(app, { exercise: 'Bench', sets: 2, weight: 135, unit: 'lb' });
    app = updateAccount(app, activeProfile(app).id, { name: 'Ash', unit: 'lb' }).app;
    const s = profileStats(activeProfile(app));
    expect(s).toMatchObject({ level: 2, totalXp: 65, entryCount: 2, totalSets: 5, goalsReached: 1, goalCount: 1 });
    expect(s.bodyWeight).toBe('198.4 lb');
    expect(s.xp).toEqual({ current: 65, needed: 100 });
    expect(s.records.map((r) => r.display)).toEqual(['135 lb × 5', '220.5 lb × 5']);
    expect(profileStats(activeProfile(withProfiles('New'))).bodyWeight).toBeNull();
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

describe('R9 account info', () => {
  it('R9.1: name and unit can be changed without touching entries, weigh-ins, or goals', () => {
    let app = withProfiles('Ash', 'Bryn');
    let p = addWeighIn(activeProfile(app), '80', at(23, 9)).profile;
    p = addGoal(p, { type: 'training', daysPerWeek: 2 }, at(23, 9)).profile;
    app = log(replaceProfile(app, p), { exercise: 'Row', weight: 50 });
    const before = activeProfile(app);
    const r = updateAccount(app, before.id, { name: 'Bryn R', unit: 'lb' });
    expect(r.ok).toBe(true);
    expect(activeProfile(r.app)).toEqual({ ...before, name: 'Bryn R', unit: 'lb' });
  });

  it('R9.1: uses the same rules as creation; keeping your own name is fine', () => {
    const app = withProfiles('Ash', 'Bryn');
    const id = activeProfile(app).id;
    expect(updateAccount(app, id, { name: 'bryn', unit: 'kg' }).ok).toBe(true);
    expect(updateAccount(app, id, { name: 'ASH', unit: 'kg' }).error).toMatch(/name/i);
    expect(updateAccount(app, id, { name: '', unit: 'kg' }).error).toMatch(/name/i);
    expect(updateAccount(app, id, { name: 'Bryn', unit: 'st' }).error).toMatch(/unit/i);
    expect(updateAccount(app, 'missing', { name: 'X', unit: 'kg' }).ok).toBe(false);
  });

  it('R9.2: changing the unit only changes how weights are shown', () => {
    let app = withProfiles('Ash');
    let p = addWeighIn(activeProfile(app), '100', at(23, 9)).profile;
    app = log(replaceProfile(app, p), { exercise: 'Squat', weight: 100 });
    const kgView = profileStats(activeProfile(app));
    app = updateAccount(app, activeProfile(app).id, { name: 'Ash', unit: 'lb' }).app;
    const lbView = profileStats(activeProfile(app));
    expect(kgView.bodyWeight).toBe('100 kg');
    expect(lbView.bodyWeight).toBe('220.5 lb');
    expect(lbView.records[0].display).toBe('220.5 lb × 5');
    expect(activeProfile(app).weighIns[0].kg).toBe(100);
  });
});

describe('R3.4 level formula', () => {
  it('R3.4: level = 1 + XP levels + PB levels + goal levels', () => {
    let app = withProfiles('Ash');
    let p = addGoal(activeProfile(app), { type: 'training', daysPerWeek: 1 }, at(23, 9)).profile;
    app = replaceProfile(app, p);
    app = log(app, { exercise: 'Squat', weight: 100 });
    app = log(app, { exercise: 'Squat', weight: 110 });
    expect(profileLevel(activeProfile(app))).toEqual({ totalXp: 50, pbLevels: 1, goalLevels: 1, level: 3 });
  });
});
