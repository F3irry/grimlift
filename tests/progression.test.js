import { describe, it, expect } from 'vitest';
import {
  xpForEntry,
  xpLevels,
  xpProgress,
  levelFor,
  isBetter,
  summarize,
  logEntry,
  deleteEntry,
  feedbackFor,
  progressChange,
} from '../src/logic/progression.js';
import { addGoal, toggleHabitDay } from '../src/logic/goals.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { at, newProfile, lift } from './helpers.js';

const NOW = new Date('2026-11-22T10:00:00Z');
const blankProfile = () => ({
  id: 'p1', name: 'Ash', unit: 'kg', entries: [], weighIns: [], goals: [], goalNote: '',
});

/** Log entries given as [exercise, sets, reps, weight, unit?]; returns final profile and last result. */
function play(...rows) {
  let profile = blankProfile();
  let result;
  for (const [exercise, sets, reps, weight, unit = 'kg'] of rows) {
    const r = logEntry(profile, { exercise, sets, reps, weight, unit }, NOW);
    expect(r.ok).toBe(true);
    profile = r.profile;
    result = r.result;
  }
  return { profile, result, summary: summarize(profile.entries) };
}

describe('R1 logging into a profile', () => {
  it('R1.1: a valid entry is saved to the profile with an id and time', () => {
    const { profile } = play(['Squat', 3, 5, 100]);
    expect(profile.entries).toHaveLength(1);
    expect(profile.entries[0]).toMatchObject({
      exercise: 'Squat', sets: 3, reps: 5, weight: 100, unit: 'kg', loggedAt: NOW.toISOString(),
    });
    expect(typeof profile.entries[0].id).toBe('string');
  });

  it('R1.2: invalid input saves nothing and returns the error', () => {
    const p = blankProfile();
    const r = logEntry(p, { exercise: 'Squat', sets: 0, reps: 5, weight: 100, unit: 'kg' }, NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/sets/i);
    expect(r.profile).toBe(p);
  });

  it('R1.3: the first typed name is kept for the record', () => {
    const { summary } = play(['Bench Press', 1, 5, 80], ['bench  press', 1, 5, 85]);
    expect(summary.bests['bench press'].name).toBe('Bench Press');
  });

  it('R1.4: deleting an entry recalculates XP, levels, and records', () => {
    const { profile } = play(['Squat', 1, 5, 100], ['Squat', 1, 5, 110]);
    expect(summarize(profile.entries).pbLevels).toBe(1);
    const after = deleteEntry(profile, profile.entries[1].id);
    const s = summarize(after.entries);
    expect(after.entries).toHaveLength(1);
    expect(s.totalXp).toBe(25);
    expect(s.pbLevels).toBe(0);
    expect(s.bests.squat.weight).toBe(100);
  });

  it('R1.4: deleting the baseline makes the next entry the new baseline', () => {
    const { profile } = play(['Squat', 1, 5, 100], ['Squat', 1, 5, 110]);
    const s = summarize(deleteEntry(profile, profile.entries[0].id).entries);
    expect(s.pbLevels).toBe(0);
    expect(s.bests.squat.weight).toBe(110);
  });
});

describe('R2 XP', () => {
  it('R2.1: each entry awards 20 + 5 per set, immediately', () => {
    expect(xpForEntry(1)).toBe(25);
    expect(xpForEntry(4)).toBe(40);
    const { result, summary } = play(['Squat', 4, 5, 100]);
    expect(result.xpEarned).toBe(40);
    expect(summary.totalXp).toBe(40);
  });

  it('R2.2: every 100 XP is one level', () => {
    expect(xpLevels(99)).toBe(0);
    expect(xpLevels(100)).toBe(1);
    expect(xpLevels(250)).toBe(2);
    // Four different exercises × (20 + 5×1) = 100 XP, no PBs → level 2.
    const { summary } = play(['A', 1, 1, 1], ['B', 1, 1, 1], ['C', 1, 1, 1], ['D', 1, 1, 1]);
    expect(summary.level).toBe(2);
  });

  it('R2.3: reports progress within the current XP level', () => {
    expect(xpProgress(0)).toEqual({ current: 0, needed: 100 });
    expect(xpProgress(235)).toEqual({ current: 35, needed: 100 });
  });
});

describe('R3 personal bests', () => {
  const k = (weight, reps, unit = 'kg') => ({ weight, reps, unit });

  it('R3.1: heavier wins; equal weight with more reps wins', () => {
    expect(isBetter(k(105, 1), k(100, 10))).toBe(true);
    expect(isBetter(k(100, 6), k(100, 5))).toBe(true);
    expect(isBetter(k(100, 5), k(100, 5))).toBe(false);
    expect(isBetter(k(95, 20), k(100, 5))).toBe(false);
  });

  it('R3.1: compares across units in kg', () => {
    expect(isBetter(k(225, 5, 'lb'), k(100, 5, 'kg'))).toBe(true); // 102.06 kg
    expect(isBetter(k(220, 5, 'lb'), k(100, 5, 'kg'))).toBe(false); // 99.79 kg
  });

  it('R3.1: weights within 0.01 kg count as equal, so reps decide', () => {
    // 100 kg is 220.462 lb.
    expect(isBetter(k(220.462, 6, 'lb'), k(100, 5, 'kg'))).toBe(true);
    expect(isBetter(k(220.462, 5, 'lb'), k(100, 5, 'kg'))).toBe(false);
  });

  it('R3.2: the first entry for an exercise is a baseline, not a PB', () => {
    const { result, summary } = play(['Squat', 3, 5, 100]);
    expect(result.personalBest).toBe(false);
    expect(summary.pbLevels).toBe(0);
  });

  it('R3.3: each PB entry gives exactly one level', () => {
    const { result, summary } = play(['Squat', 1, 5, 100], ['Squat', 5, 5, 105], ['Squat', 1, 5, 110]);
    expect(result.personalBest).toBe(true);
    expect(summary.pbLevels).toBe(2);
  });

  it('R3.3: a weaker entry does not lower the record or give a level', () => {
    const { result, summary } = play(['Squat', 1, 5, 120], ['Squat', 1, 8, 100]);
    expect(result.personalBest).toBe(false);
    expect(summary.bests.squat).toMatchObject({ weight: 120, reps: 5, unit: 'kg' });
  });

  it('R3.4: level = 1 + XP levels + PB levels', () => {
    expect(levelFor(0, 0)).toBe(1);
    expect(levelFor(250, 3)).toBe(6);
    const { result } = play(['Squat', 1, 5, 100], ['Squat', 1, 5, 110]);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2); // 50 XP, 1 PB level
  });
});

describe('R6 instant feedback', () => {
  it('R6.1: a plain entry gives only an XP event', () => {
    const { result } = play(['Squat', 2, 5, 100]);
    expect(feedbackFor(result)).toEqual([{ type: 'xp', amount: 30, text: '+30 XP' }]);
  });

  it('R6.1: a PB gives XP, PB, then level-up events in that order', () => {
    const { result } = play(['Squat', 1, 5, 100], ['Squat', 1, 5, 110]);
    const events = feedbackFor(result);
    expect(events.map((e) => e.type)).toEqual(['xp', 'pb', 'level']);
    expect(events[1]).toMatchObject({ exercise: 'Squat', weight: 110, reps: 5, unit: 'kg' });
    expect(events[2]).toMatchObject({ level: 2 });
  });

  it('R6.1: crossing 100 XP without a PB gives XP then level-up', () => {
    const { result } = play(['A', 1, 1, 1], ['B', 1, 1, 1], ['C', 1, 1, 1], ['D', 1, 1, 1]);
    expect(feedbackFor(result).map((e) => e.type)).toEqual(['xp', 'level']);
  });

  it('R6.1 / R3.4: a lift that reaches a goal gives XP, PB, goal, then one level-up event', () => {
    let p = lift(newProfile(), ['Squat', 1, 5, 100], at(23, 8)).profile;
    p = addGoal(p, { type: 'lift', exercise: 'Squat', targetWeight: '105', unit: 'kg', targetReps: '5' }, at(23, 9)).profile;
    const { result } = lift(p, ['Squat', 1, 5, 105], at(24));
    const events = feedbackFor(result);
    expect(events.map((e) => e.type)).toEqual(['xp', 'pb', 'goal', 'level']);
    expect(events[2]).toMatchObject({ title: 'Squat 105 kg × 5', text: 'Goal reached: Squat 105 kg × 5' });
    expect(events[3]).toMatchObject({ level: 3 }); // 50 XP + 1 PB level + 1 goal level
  });

  it('R6.1: a weigh-in that reaches a goal gives goal and level-up events, no XP', () => {
    let p = addWeighIn(newProfile(), '90', at(23, 8)).profile;
    p = addGoal(p, { type: 'bodyweight', targetWeight: '89' }, at(23, 9)).profile;
    const after = addWeighIn(p, '88.9', at(25)).profile;
    const events = feedbackFor(progressChange(p, after));
    expect(events.map((e) => e.type)).toEqual(['goal', 'level']);
    expect(events[1]).toMatchObject({ level: 2 });
  });

  it('R6.1: a habit tick that reaches a goal gives goal and level-up events', () => {
    let p = addGoal(newProfile(), { type: 'habit', name: 'Stretch', daysPerWeek: 1 }, at(23, 9)).profile;
    const after = toggleHabitDay(p, p.goals[0].id, '2026-11-23', at(23, 20)).profile;
    expect(feedbackFor(progressChange(p, after)).map((e) => e.type)).toEqual(['goal', 'level']);
  });

  it('R6.1: a change that reaches nothing gives no events', () => {
    const p = newProfile();
    const after = addWeighIn(p, '80', at(23)).profile;
    expect(feedbackFor(progressChange(p, after))).toEqual([]);
  });
});
