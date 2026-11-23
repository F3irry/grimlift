import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, V3_KEY, V2_KEY, LEGACY_KEY, loadApp, saveApp, migrateV2, migrateV3 } from '../src/storage.js';
import { createApp, createProfile, activeProfile, replaceProfile, profileStats } from '../src/logic/profiles.js';
import { logEntry } from '../src/logic/progression.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { addGoal, toggleHabitDay } from '../src/logic/goals.js';
import { setLimitations } from '../src/logic/limitations.js';
import { at } from './helpers.js';

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
  let app = createProfile(createApp(), { name: 'Ash', unit: 'lb', bodyWeight: '180' }, at(23, 8)).app;
  app = createProfile(app, { name: 'Bryn' }, at(23, 8)).app;
  app = { ...app, activeProfileId: app.profiles[0].id };
  let p = activeProfile(app);
  p = addGoal(p, { type: 'lift', exercise: 'Squat', targetWeight: '315', unit: 'lb', targetReps: '5' }, at(23, 9)).profile;
  p = addGoal(p, { type: 'bodyweight', targetWeight: '170' }, at(23, 9)).profile;
  p = addGoal(p, { type: 'training', daysPerWeek: '3' }, at(23, 9)).profile;
  p = addGoal(p, { type: 'habit', name: 'Walk', daysPerWeek: '4' }, at(23, 9)).profile;
  p = toggleHabitDay(p, p.goals[3].id, '2026-11-23', at(23, 20)).profile;
  for (const weight of [225, 245]) {
    p = logEntry(p, { exercise: 'Squat', sets: 3, reps: 5, weight, unit: 'lb' }, at(23, 10)).profile;
  }
  p = addWeighIn(p, '178', at(24)).profile;
  p = setLimitations(p, { areas: ['knees'], equipment: 'dumbbells', experience: 'intermediate' }, at(24)).profile;
  return replaceProfile(app, { ...p, goalNote: 'Stay consistent' });
}

describe('R4 persistence', () => {
  it('R4.1: saving writes JSON under the v4 key', () => {
    const storage = fakeStorage();
    expect(STORAGE_KEY).toBe('grimlift:v4');
    expect(saveApp(storage, sampleApp())).toBe(true);
    expect(JSON.parse(storage.raw.get(STORAGE_KEY)).profiles).toHaveLength(2);
  });

  it('R4.1 / R4.2: profiles, entries, weigh-ins, goals, checks, note, and limitations survive a reload', () => {
    const storage = fakeStorage();
    const before = sampleApp();
    saveApp(storage, before);
    const after = loadApp(storage);
    expect(after).toEqual(before);
    const p = activeProfile(after);
    expect(p.goals).toHaveLength(4);
    expect(p.goals[3].checks).toEqual(['2026-11-23']);
    expect(p.weighIns).toHaveLength(2);
    expect(p.limitations).toHaveLength(1);
    expect(profileStats(p, at(24)).level).toBe(3); // 70 XP + 30 for the weigh-in challenge, + 1 PB level
  });

  it('R4.3: no saved data gives a fresh app with no profiles', () => {
    expect(loadApp(fakeStorage())).toEqual(createApp());
  });

  it('R4.3: unreadable or wrong-shaped data gives a fresh app', () => {
    const good = sampleApp();
    const withProfile = (patch) => JSON.stringify({ ...good, profiles: [{ ...good.profiles[0], ...patch }] });
    const bad = [
      '{not json', 'null', '42', '[]', '{"profiles":"x"}',
      JSON.stringify({ ...good, activeProfileId: 'missing' }),
      JSON.stringify({ ...good, version: 2 }),
      withProfile({ weighIns: [{ id: 'w', at: 'x', kg: -1 }] }),
      withProfile({ goals: [{ id: 'g', type: 'vibes', createdAt: 'x' }] }),
      withProfile({ goals: [{ id: 'g', type: 'habit', createdAt: 'x', name: 'Walk', daysPerWeek: 3 }] }),
      withProfile({ goalNote: 5 }),
      withProfile({ limitations: undefined }),
      withProfile({ limitations: [{ at: 'x', areas: ['neck'], equipment: 'gym', experience: 'beginner' }] }),
      withProfile({ limitations: [{ at: 'x', areas: ['knees', 'knees'], equipment: 'gym', experience: 'beginner' }] }),
      withProfile({ limitations: [{ at: 'x', areas: [], equipment: 'bands', experience: 'beginner' }] }),
      withProfile({ limitations: [{ at: 'x', areas: [], equipment: 'gym', experience: 'pro' }] }),
      JSON.stringify({ ...good, version: 3 }),
    ];
    for (const raw of bad) {
      expect(loadApp(fakeStorage({ [STORAGE_KEY]: raw })), raw.slice(0, 60)).toEqual(createApp());
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

describe('R4.5 migrating round-2 data', () => {
  const entry = { id: 'e1', loggedAt: '2026-11-20T10:00:00.000Z', exercise: 'Squat', sets: 3, reps: 5, weight: 100, unit: 'kg' };
  const v2 = {
    version: 2,
    activeProfileId: 'p2',
    profiles: [
      { id: 'p1', createdAt: '2026-11-01T00:00:00.000Z', name: 'Ash', unit: 'kg', bodyWeightKg: 82.5, goal: 'Squat 140', entries: [entry] },
      { id: 'p2', createdAt: '2026-11-02T00:00:00.000Z', name: 'Bryn', unit: 'lb', bodyWeightKg: null, goal: '', entries: [] },
    ],
  };

  it('R4.5: keeps profiles, entries, and the active profile; converts body weight and goal text (to v3 shape)', () => {
    const now = at(25);
    const app = migrateV2(v2, now);
    expect(app.version).toBe(3);
    expect(app.activeProfileId).toBe('p2');
    expect(app.profiles[0]).toEqual({
      id: 'p1', createdAt: '2026-11-01T00:00:00.000Z', name: 'Ash', unit: 'kg', entries: [entry],
      weighIns: [{ id: expect.any(String), at: now.toISOString(), kg: 82.5 }],
      goals: [], goalNote: 'Squat 140',
    });
    expect(app.profiles[1]).toMatchObject({ weighIns: [], goals: [], goalNote: '' });
  });

  it('R4.5 / R4.6: loads v2 data when there is no v4 or v3 data, leaving the v2 key alone', () => {
    const raw = JSON.stringify(v2);
    const storage = fakeStorage({ [V2_KEY]: raw });
    const app = loadApp(storage, at(25));
    expect(V2_KEY).toBe('grimlift:v2');
    expect(app.version).toBe(4);
    expect(app.profiles[0].limitations).toEqual([]);
    expect(activeProfile(app).name).toBe('Bryn');
    expect(app.profiles[0].entries).toEqual([entry]);
    expect(storage.raw.get(V2_KEY)).toBe(raw);
  });

  it('R4.5: v4 data wins over v2 data', () => {
    const storage = fakeStorage({ [V2_KEY]: JSON.stringify(v2) });
    saveApp(storage, sampleApp());
    expect(activeProfile(loadApp(storage)).name).toBe('Ash');
  });

  it('R4.5: a goal note longer than 140 characters is cut to fit', () => {
    const long = { ...v2, profiles: [{ ...v2.profiles[0], goal: 'g'.repeat(200) }] };
    expect(migrateV2(long, at(25)).profiles[0].goalNote).toHaveLength(140);
  });

  it('R4.5: broken v2 data gives a fresh app', () => {
    const storage = fakeStorage({ [V2_KEY]: '{"version":2,"profiles":[{"id":1}]}' });
    expect(loadApp(storage, at(25))).toEqual(createApp());
  });
});

describe('R4.6 migrating round-3/4 data', () => {
  /** A v4 app turned back into the v3 shape it had before round 5. */
  function v3App() {
    const app = sampleApp();
    return {
      ...app,
      version: 3,
      profiles: app.profiles.map(({ limitations, ...rest }) => rest),
    };
  }

  it('R4.6: keeps everything and gives each profile an empty limitations history', () => {
    const v3 = v3App();
    const app = migrateV3(v3);
    expect(V3_KEY).toBe('grimlift:v3');
    expect(app.version).toBe(4);
    expect(app.activeProfileId).toBe(v3.activeProfileId);
    expect(app.profiles).toEqual(v3.profiles.map((p) => ({ ...p, limitations: [] })));
  });

  it('R4.6: loads v3 data when there is no v4 data, leaving the v3 key alone', () => {
    const raw = JSON.stringify(v3App());
    const storage = fakeStorage({ [V3_KEY]: raw, [V2_KEY]: '{"version":2,"profiles":[],"activeProfileId":null}' });
    const app = loadApp(storage, at(25));
    expect(activeProfile(app).name).toBe('Ash');
    expect(activeProfile(app).entries).toHaveLength(2);
    expect(activeProfile(app).limitations).toEqual([]);
    expect(storage.raw.get(V3_KEY)).toBe(raw);
  });

  it('R4.6: v4 data wins over v3 data', () => {
    const storage = fakeStorage({ [V3_KEY]: JSON.stringify({ ...v3App(), activeProfileId: null }) });
    saveApp(storage, sampleApp());
    expect(activeProfile(loadApp(storage)).limitations).toHaveLength(1);
  });

  it('R4.6: broken v4 data starts fresh instead of falling back to v3', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{broken', [V3_KEY]: JSON.stringify(v3App()) });
    expect(loadApp(storage)).toEqual(createApp());
  });

  it('R4.6: broken v3 data gives a fresh app', () => {
    const storage = fakeStorage({ [V3_KEY]: '{"version":3,"profiles":[{"id":1}],"activeProfileId":null}' });
    expect(loadApp(storage)).toEqual(createApp());
  });
});
