import { describe, it, expect } from 'vitest';
import {
  addGoal,
  deleteGoal,
  goalStatus,
  goalLevels,
  reachedGoalIds,
  toggleHabitDay,
  setGoalNote,
  MAX_GOALS,
} from '../src/logic/goals.js';
import { addWeighIn, deleteWeighIn } from '../src/logic/bodyweight.js';
import { deleteEntry } from '../src/logic/progression.js';
import { at, newProfile, lift } from './helpers.js';

const goal = (profile, input, now = at(23, 9)) => {
  const r = addGoal(profile, input, now);
  if (!r.ok) throw new Error(r.error);
  return r;
};
const only = (profile) => profile.goals[0];

describe('R11.1 adding goals', () => {
  it('R11.1: supports lift, body-weight, training, and habit goals together', () => {
    let p = addWeighIn(newProfile(), '90', at(23, 8)).profile;
    p = goal(p, { type: 'lift', exercise: 'Squat', targetWeight: '140', unit: 'kg', targetReps: '5' }).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '80' }).profile;
    p = goal(p, { type: 'training', daysPerWeek: '3' }).profile;
    p = goal(p, { type: 'habit', name: 'Sleep 8 hours', daysPerWeek: '5' }).profile;
    expect(p.goals.map((g) => g.type)).toEqual(['lift', 'bodyweight', 'training', 'habit']);
    expect(p.goals.every((g) => typeof g.id === 'string' && g.createdAt === at(23, 9).toISOString())).toBe(true);
  });

  it('R11.1: rejects an unknown type and more than 12 goals', () => {
    let p = newProfile();
    expect(addGoal(p, { type: 'vibes' }, at(23)).error).toMatch(/goal type/i);
    for (let i = 0; i < MAX_GOALS; i += 1) p = goal(p, { type: 'training', daysPerWeek: 3 }).profile;
    expect(MAX_GOALS).toBe(12);
    const r = addGoal(p, { type: 'training', daysPerWeek: 3 }, at(23));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/12/);
  });
});

describe('R11.2 lift targets', () => {
  it('R11.2: validates exercise, target weight, unit, and reps', () => {
    const p = newProfile();
    const base = { type: 'lift', exercise: 'Squat', targetWeight: '140', unit: 'kg', targetReps: '5' };
    expect(addGoal(p, { ...base, exercise: ' ' }, at(23)).error).toMatch(/exercise/i);
    for (const targetWeight of ['', '0', '-1', 'x']) {
      expect(addGoal(p, { ...base, targetWeight }, at(23)).error).toMatch(/target weight/i);
    }
    expect(addGoal(p, { ...base, unit: 'st' }, at(23)).error).toMatch(/unit/i);
    for (const targetReps of ['0', '1.5', '1001', '']) {
      expect(addGoal(p, { ...base, targetReps }, at(23)).error).toMatch(/reps/i);
    }
    expect(only(goal(p, base).profile)).toMatchObject({
      type: 'lift', exercise: 'Squat', targetWeight: 140, unit: 'kg', targetReps: 5, baselineKg: 0,
    });
  });

  it('R11.2: baseline is the heaviest weight logged with at least the target reps', () => {
    let p = newProfile();
    p = lift(p, ['Squat', 1, 3, 130], at(23)).profile; // too few reps to count
    p = lift(p, ['squat', 1, 5, 100], at(23)).profile;
    p = lift(p, ['Squat', 1, 8, 110], at(23)).profile;
    p = goal(p, { type: 'lift', exercise: 'Squat', targetWeight: '140', unit: 'kg', targetReps: '5' }, at(23, 12)).profile;
    expect(only(p).baselineKg).toBe(110);
  });

  it('R11.2: rejected when the target is already met', () => {
    let p = lift(newProfile(), ['Squat', 1, 5, 140], at(23)).profile;
    const r = addGoal(p, { type: 'lift', exercise: 'squat', targetWeight: '140', unit: 'kg', targetReps: '5' }, at(23, 12));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already/i);
  });

  it('R11.2 / R11.6: progress runs from baseline to target', () => {
    let p = lift(newProfile(), ['Squat', 1, 5, 100], at(23)).profile;
    p = goal(p, { type: 'lift', exercise: 'Squat', targetWeight: '140', unit: 'kg', targetReps: '5' }, at(23, 12)).profile;
    expect(goalStatus(only(p), p, at(23, 13))).toMatchObject({ progress: 0, percent: 0, reached: false, remaining: '40 kg to go' });
    p = lift(p, ['Squat', 1, 5, 130], at(24)).profile;
    expect(goalStatus(only(p), p, at(24))).toMatchObject({ progress: 0.75, percent: 75, reached: false, remaining: '10 kg to go' });
  });

  it('R11.2: reached by an entry after creation meeting weight and reps, across units', () => {
    let p = lift(newProfile(), ['Squat', 1, 5, 100], at(23)).profile;
    p = goal(p, { type: 'lift', exercise: 'Squat', targetWeight: '300', unit: 'lb', targetReps: '5' }, at(23, 12)).profile;
    p = lift(p, ['Squat', 1, 4, 140], at(24)).profile; // heavy enough, too few reps
    expect(goalStatus(only(p), p, at(24)).reached).toBe(false);
    p = lift(p, ['Squat', 1, 5, 136.1], at(25)).profile; // 300.05 lb
    const s = goalStatus(only(p), p, at(25));
    expect(s).toMatchObject({ reached: true, progress: 1, percent: 100 });
    expect(s.title).toBe('Squat 300 lb × 5');
  });
});

describe('R11.3 body-weight targets', () => {
  it('R11.3: needs a current body weight and a target at least 0.1 kg away', () => {
    const p = newProfile();
    expect(addGoal(p, { type: 'bodyweight', targetWeight: '80' }, at(23)).error).toMatch(/body weight first/i);
    const q = addWeighIn(p, '90', at(23, 8)).profile;
    expect(addGoal(q, { type: 'bodyweight', targetWeight: '90.05' }, at(23)).error).toMatch(/differ/i);
    for (const targetWeight of ['', '0', 'x', '701']) {
      expect(addGoal(q, { type: 'bodyweight', targetWeight }, at(23)).error).toMatch(/target weight/i);
    }
  });

  it('R11.3: target is entered in the preferred unit; start is the current weight', () => {
    let p = addWeighIn(newProfile({ unit: 'lb' }), '200', at(23, 8)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '180' }).profile;
    expect(only(p).startKg).toBeCloseTo(90.718474, 6);
    expect(only(p).targetKg).toBeCloseTo(81.6466266, 6);
    expect(goalStatus(only(p), p, at(23)).title).toBe('Reach 180 lb');
  });

  it('R11.3 / R11.6: progress works for losing weight', () => {
    let p = addWeighIn(newProfile(), '90', at(23, 8)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '80' }).profile;
    p = addWeighIn(p, '87.5', at(24)).profile;
    expect(goalStatus(only(p), p, at(24))).toMatchObject({ progress: 0.25, percent: 25, reached: false, remaining: '7.5 kg to lose' });
    p = addWeighIn(p, '79.8', at(30)).profile;
    expect(goalStatus(only(p), p, at(30))).toMatchObject({ reached: true, percent: 100 });
  });

  it('R11.3: progress works for gaining weight and is clamped at 0', () => {
    let p = addWeighIn(newProfile(), '60', at(23, 8)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '70' }).profile;
    p = addWeighIn(p, '58', at(24)).profile;
    expect(goalStatus(only(p), p, at(24))).toMatchObject({ progress: 0, remaining: '12 kg to gain' });
    p = addWeighIn(p, '70', at(25)).profile;
    expect(goalStatus(only(p), p, at(25)).reached).toBe(true);
  });

  it('R11.3: stays reached after the weight moves back, until that weigh-in is deleted', () => {
    let p = addWeighIn(newProfile(), '90', at(23, 8)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '85' }).profile;
    p = addWeighIn(p, '85', at(24)).profile;
    const hit = p.weighIns[1].id;
    p = addWeighIn(p, '86', at(25)).profile;
    expect(goalStatus(only(p), p, at(25)).reached).toBe(true);
    p = deleteWeighIn(p, hit);
    expect(goalStatus(only(p), p, at(25)).reached).toBe(false);
  });
});

describe('R11.4 weekly training targets', () => {
  it('R11.4: validates days per week 1-7', () => {
    const p = newProfile();
    for (const daysPerWeek of ['0', '8', '2.5', '']) {
      expect(addGoal(p, { type: 'training', daysPerWeek }, at(23)).error).toMatch(/days per week/i);
    }
  });

  it('R11.4 / R11.6: progress counts distinct days with a lift this week', () => {
    let p = goal(newProfile(), { type: 'training', daysPerWeek: '3' }).profile;
    p = lift(p, ['Squat', 1, 5, 100], at(23, 10)).profile;
    p = lift(p, ['Bench', 1, 5, 60], at(23, 18)).profile; // same day
    p = lift(p, ['Row', 1, 5, 50], at(25)).profile;
    expect(goalStatus(only(p), p, at(25))).toMatchObject({
      title: 'Train 3 days a week', percent: 67, reached: false, remaining: '1 more day this week',
    });
    p = lift(p, ['Row', 1, 5, 50], at(27)).profile;
    expect(goalStatus(only(p), p, at(27))).toMatchObject({ percent: 100, reached: true, remaining: 'Done this week' });
    // Next week: progress resets, but the goal stays reached.
    expect(goalStatus(only(p), p, at(30))).toMatchObject({ percent: 0, reached: true, remaining: '3 more days this week' });
  });

  it('R11.4: only lifts logged after the goal was created count, for progress and reaching', () => {
    let p = lift(newProfile(), ['Squat', 1, 5, 100], at(23, 7)).profile;
    p = goal(p, { type: 'training', daysPerWeek: '1' }, at(23, 9)).profile;
    expect(goalStatus(only(p), p, at(23, 9))).toMatchObject({ percent: 0, reached: false });
    p = lift(p, ['Squat', 1, 5, 100], at(23, 10)).profile;
    expect(goalStatus(only(p), p, at(23, 10)).reached).toBe(true);
  });
});

describe('R11.5 custom habits', () => {
  const habit = (p, now = at(24, 9)) => goal(p, { type: 'habit', name: '  Sleep 8 hours ', daysPerWeek: '2' }, now).profile;

  it('R11.5: validates the name (1-60) and days per week', () => {
    const p = newProfile();
    expect(addGoal(p, { type: 'habit', name: '', daysPerWeek: 3 }, at(23)).error).toMatch(/habit/i);
    expect(addGoal(p, { type: 'habit', name: 'x'.repeat(61), daysPerWeek: 3 }, at(23)).error).toMatch(/habit/i);
    expect(addGoal(p, { type: 'habit', name: 'Walk', daysPerWeek: 9 }, at(23)).error).toMatch(/days per week/i);
    expect(only(habit(p))).toMatchObject({ name: 'Sleep 8 hours', daysPerWeek: 2, checks: [] });
  });

  it('R11.5: days from creation up to today can be ticked and unticked', () => {
    let p = habit(newProfile()); // created Tue 24 Nov
    const id = only(p).id;
    const now = at(26);
    for (const day of ['2026-11-23', '2026-11-27', '2026-11-30', '2026-11-16']) {
      const r = toggleHabitDay(p, id, day, now);
      expect(r.ok, day).toBe(false);
      expect(r.profile).toBe(p);
    }
    p = toggleHabitDay(p, id, '2026-11-24', now).profile;
    p = toggleHabitDay(p, id, '2026-11-26', now).profile;
    expect(only(p).checks).toEqual(['2026-11-24', '2026-11-26']);
    p = toggleHabitDay(p, id, '2026-11-24', now).profile;
    expect(only(p).checks).toEqual(['2026-11-26']);
  });

  it('R11.5 / R11.6: progress is ticks this week over the target; reaching it sticks', () => {
    let p = habit(newProfile());
    const id = only(p).id;
    p = toggleHabitDay(p, id, '2026-11-24', at(25)).profile;
    expect(goalStatus(only(p), p, at(25))).toMatchObject({
      title: 'Sleep 8 hours · 2 days a week', percent: 50, reached: false, remaining: '1 more day this week',
    });
    p = toggleHabitDay(p, id, '2026-11-25', at(25)).profile;
    expect(goalStatus(only(p), p, at(25)).reached).toBe(true);
    expect(goalStatus(only(p), p, at(30))).toMatchObject({ percent: 0, reached: true });
  });
});

describe('R11.7 - R11.9 managing goals and rewards', () => {
  it('R11.7: a goal can be deleted', () => {
    let p = goal(newProfile(), { type: 'training', daysPerWeek: 2 }).profile;
    p = goal(p, { type: 'training', daysPerWeek: 4 }).profile;
    p = deleteGoal(p, p.goals[0].id);
    expect(p.goals.map((g) => g.daysPerWeek)).toEqual([4]);
  });

  it('R11.8: each reached goal gives one level; deleting it removes the level', () => {
    let p = goal(newProfile(), { type: 'training', daysPerWeek: 1 }).profile;
    p = goal(p, { type: 'training', daysPerWeek: 7 }).profile;
    expect(goalLevels(p)).toBe(0);
    p = lift(p, ['Squat', 1, 5, 100], at(23, 10)).profile;
    expect(goalLevels(p)).toBe(1);
    expect(reachedGoalIds(p)).toEqual([p.goals[0].id]);
    expect(goalLevels(deleteGoal(p, p.goals[0].id))).toBe(0);
  });

  it('R11.8 / R1.4: deleting the lift that reached a goal removes the level', () => {
    let p = goal(newProfile(), { type: 'training', daysPerWeek: 1 }).profile;
    p = lift(p, ['Squat', 1, 5, 100], at(23, 10)).profile;
    expect(goalLevels(p)).toBe(1);
    expect(goalLevels(deleteEntry(p, p.entries[0].id))).toBe(0);
  });

  it('R11.9: the goals note is trimmed and limited to 140 characters', () => {
    const p = newProfile();
    expect(setGoalNote(p, '  Get strong  ').profile.goalNote).toBe('Get strong');
    const r = setGoalNote(p, 'x'.repeat(141));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/note/i);
  });
});
