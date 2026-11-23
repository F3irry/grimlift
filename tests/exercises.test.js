import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  BODY_PARTS,
  findExercise,
  isAllowed,
  blockReason,
  suggestions,
  prescription,
  blockedGoals,
} from '../src/logic/exercises.js';
import { AREAS, EQUIPMENT, setLimitations } from '../src/logic/limitations.js';
import { normalizeName } from '../src/logic/entries.js';
import { addGoal } from '../src/logic/goals.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { at, newProfile, lift, SHAMING } from './helpers.js';

const limits = (input) => ({ areas: [], equipment: 'gym', experience: 'beginner', ...input });
const withLimits = (p, input) => setLimitations(p, limits(input), at(23, 9)).profile;
const liftGoal = (p, exercise, targetWeight = '100', targetReps = '5') =>
  addGoal(p, { type: 'lift', exercise, targetWeight, unit: 'kg', targetReps }, at(23, 9)).profile;
const names = (part, p) => suggestions(p).find((s) => s.bodyPart === part).items.map((i) => i.name);

describe('R13.2 exercise catalog', () => {
  it('R13.2: every body part has at least two exercises and one bodyweight exercise', () => {
    expect(BODY_PARTS).toEqual(['legs', 'back', 'chest', 'shoulders', 'arms', 'core']);
    for (const part of BODY_PARTS) {
      const list = CATALOG.filter((e) => e.bodyPart === part);
      expect(list.length, part).toBeGreaterThanOrEqual(2);
      expect(list.some((e) => e.equipment === 'bodyweight'), part).toBe(true);
    }
  });

  it('R13.2: every exercise has a known body part, equipment, and loaded areas', () => {
    for (const e of CATALOG) {
      expect(BODY_PARTS).toContain(e.bodyPart);
      expect(EQUIPMENT).toContain(e.equipment);
      for (const a of e.loads) expect(AREAS, e.name).toContain(a);
    }
  });

  it('R13.2: no two exercises share a name or other name', () => {
    const all = CATALOG.flatMap((e) => [e.name, ...e.aka].map(normalizeName));
    expect(new Set(all).size).toBe(all.length);
  });

  it('R13.2: typed names match by name or other name, ignoring case and spaces', () => {
    expect(findExercise('bench  PRESS').name).toBe('Barbell Bench Press');
    expect(findExercise('Squat').name).toBe('Back Squat');
    expect(findExercise(' goblet squat ').name).toBe('Goblet Squat');
    expect(findExercise('Zercher Squat')).toBeNull();
  });
});

describe('R13.3 limitations always win', () => {
  it('R13.3: an exercise that loads a protected area is not allowed', () => {
    const squat = findExercise('Back Squat');
    expect(isAllowed(squat, limits())).toBe(true);
    expect(isAllowed(squat, limits({ areas: ['knees'] }))).toBe(false);
    expect(blockReason(squat, limits({ areas: ['knees'] }))).toEqual({ area: 'knees' });
  });

  it('R13.3: an exercise needing missing equipment is not allowed', () => {
    const goblet = findExercise('Goblet Squat');
    expect(blockReason(goblet, limits({ equipment: 'bodyweight' }))).toEqual({ equipment: 'dumbbells' });
    expect(isAllowed(goblet, limits({ equipment: 'dumbbells' }))).toBe(true);
  });

  it('R13.3: a goal does not override limitations in suggestions', () => {
    let p = liftGoal(newProfile(), 'Back Squat');
    p = withLimits(p, { areas: ['knees'] });
    expect(names('legs', p)).not.toContain('Back Squat');
  });
});

describe('R13.4 suggestions by body part', () => {
  it('R13.4: with no goals, one allowed exercise per body part, in body-part order', () => {
    const s = suggestions(newProfile());
    expect(s.map((x) => x.bodyPart)).toEqual(BODY_PARTS);
    for (const part of s) expect(part.items).toHaveLength(1);
    expect(s[0].items[0].name).toBe('Back Squat');
  });

  it('R13.4: with goals, up to two per body part', () => {
    const p = addGoal(newProfile(), { type: 'training', daysPerWeek: 3 }, at(23, 9)).profile;
    for (const part of suggestions(p)) expect(part.items).toHaveLength(2);
  });

  it('R13.4: active lift-goal exercises come first, then logged ones, then catalog order', () => {
    let p = liftGoal(newProfile(), 'Leg Press');
    expect(names('legs', p)).toEqual(['Leg Press', 'Back Squat']);
    p = lift(p, ['goblet squat', 3, 8, 20], at(23, 10)).profile;
    expect(names('legs', p)).toEqual(['Leg Press', 'goblet squat']); // as typed
  });

  it('R13.4: a reached lift goal no longer moves its exercise to the front', () => {
    let p = liftGoal(newProfile(), 'Lying Leg Curl', '40', '10');
    expect(names('legs', p)).toEqual(['Lying Leg Curl', 'Back Squat']);
    p = lift(p, ['Leg Press', 3, 10, 40], at(23, 10)).profile;
    p = lift(p, ['Lying Leg Curl', 3, 10, 40], at(23, 11)).profile; // reaches the goal
    expect(names('legs', p)).toEqual(['Leg Press', 'Lying Leg Curl']); // logged order now
  });

  it('R13.4: goal and logged exercises keep the name the user typed', () => {
    let p = liftGoal(newProfile(), 'bench press');
    p = lift(p, ['Lat pulldown', 3, 10, 40], at(23, 10)).profile;
    p = lift(p, ['LAT PULLDOWN', 3, 10, 45], at(23, 11)).profile;
    expect(names('chest', p)[0]).toBe('bench press');
    expect(names('back', p)[0]).toBe('Lat pulldown');
    expect(names('legs', p)[0]).toBe('Back Squat');
  });

  it('R13.4: suggestions respect equipment and protected areas', () => {
    const p = withLimits(newProfile(), { equipment: 'bodyweight', areas: ['knees'] });
    for (const part of suggestions(p)) {
      for (const item of part.items) {
        const e = findExercise(item.name);
        expect(e.equipment).toBe('bodyweight');
        expect(e.loads).not.toContain('knees');
      }
    }
  });

  it('R13.4: a body part with nothing allowed says so instead', () => {
    const p = withLimits(newProfile(), { equipment: 'bodyweight', areas: ['shoulders', 'elbows', 'wrists'] });
    const chest = suggestions(p).find((s) => s.bodyPart === 'chest');
    expect(chest.items).toEqual([]);
    expect(chest.message).toMatch(/nothing/i);
    expect(chest.message).toMatch(/rest|professional/i);
  });
});

describe('R13.5 sets and reps', () => {
  it('R13.5: sets follow experience', () => {
    const plain = findExercise('Leg Press');
    for (const [experience, sets] of [['beginner', 2], ['intermediate', 3], ['advanced', 4]]) {
      const p = withLimits(newProfile(), { experience });
      expect(prescription(plain, p).text).toBe(`${sets} × 8–12`);
    }
  });

  it('R13.5: a lift goal uses its target reps; a hold is timed', () => {
    const p = liftGoal(newProfile(), 'Leg Press', '100', '6');
    expect(prescription(findExercise('Leg Press'), p).text).toBe('2 × 6');
    expect(prescription(findExercise('Plank'), p).text).toBe('2 × 20–40 s');
  });

  it('R13.5: an active body-weight goal to lose uses 12–15; to gain uses 8–12', () => {
    const base = addWeighIn(newProfile(), '80', at(23, 8)).profile;
    const lose = addGoal(base, { type: 'bodyweight', targetWeight: '75' }, at(23, 9)).profile;
    const gain = addGoal(base, { type: 'bodyweight', targetWeight: '85' }, at(23, 9)).profile;
    expect(prescription(findExercise('Leg Press'), lose).reps).toBe('12–15');
    expect(prescription(findExercise('Leg Press'), gain).reps).toBe('8–12');
  });
});

describe('R13.6 blocked goals', () => {
  it('R13.6: a goal blocked by a protected area names it and a safer alternative', () => {
    const p = withLimits(liftGoal(newProfile(), 'Squat'), { areas: ['knees'] });
    const [note] = blockedGoals(p);
    expect(note.alternative).toBe('Romanian Deadlift');
    expect(note.text).toMatch(/knees/);
    expect(note.text).toMatch(/Romanian Deadlift/);
  });

  it('R13.6: a goal blocked by equipment says what is missing', () => {
    const p = withLimits(liftGoal(newProfile(), 'Bench Press'), { equipment: 'bodyweight' });
    const [note] = blockedGoals(p);
    expect(note.text).toMatch(/full gym/);
    expect(note.alternative).toBe('Push-up');
  });

  it('R13.6: with no allowed alternative, it says nothing fits', () => {
    const p = withLimits(liftGoal(newProfile(), 'Push-up', '0.5'), { equipment: 'bodyweight', areas: ['elbows'] });
    const [note] = blockedGoals(p);
    expect(note.alternative).toBeNull();
    expect(note.text).toMatch(/nothing/i);
  });

  it('R13.6: allowed goals and exercises outside the catalog give no note', () => {
    let p = liftGoal(newProfile(), 'Zercher Squat');
    p = liftGoal(p, 'Leg Press');
    expect(blockedGoals(withLimits(p, { areas: ['wrists'] }))).toEqual([]);
  });
});

describe('R13.14 tone of suggestions', () => {
  it('R13.14: notes and messages say what to do and never shame', () => {
    const blocked = withLimits(liftGoal(liftGoal(newProfile(), 'Squat'), 'Push-up', '0.5'), { equipment: 'bodyweight', areas: ['knees', 'hips', 'elbows', 'shoulders', 'wrists', 'lowerBack'] });
    const texts = [
      ...blockedGoals(blocked).map((n) => n.text),
      ...suggestions(blocked).map((s) => s.message).filter(Boolean),
    ];
    expect(texts.length).toBeGreaterThan(2);
    for (const t of texts) {
      expect(t, t).not.toMatch(SHAMING);
      expect(t, t).toMatch(/\b(train|rest|ask)\b/i);
    }
  });
});
