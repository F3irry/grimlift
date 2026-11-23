import { describe, it, expect } from 'vitest';
import {
  weekChallenges,
  currentChallenges,
  challengeXp,
  paceWarnings,
  CHALLENGE_XP,
} from '../src/logic/challenges.js';
import { feedbackFor, deleteEntry, profileLevel, summarize } from '../src/logic/progression.js';
import { addGoal, deleteGoal } from '../src/logic/goals.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { setLimitations } from '../src/logic/limitations.js';
import { at, newProfile, lift, SHAMING } from './helpers.js';

// Mondays: at(16), at(23), at(30); at(37) is Mon 7 Dec.
const WEEK_16 = '2026-11-16';
const WEEK_23 = '2026-11-23';
const WEEK_30 = '2026-11-30';

const start = () => newProfile({}, at(9, 8));
/** Log one 1-set Squat on each given at() day. */
function trainOn(days, p = start(), row = ['Squat', 1, 5, 50]) {
  for (const d of days) p = lift(p, row, at(d)).profile;
  return p;
}
const goal = (p, input, when = at(23, 9)) => {
  const r = addGoal(p, input, when);
  if (!r.ok) throw new Error(r.error);
  return r.profile;
};
const liftGoal = (p, exercise, targetWeight, targetReps = 5, unit = 'kg', when = at(23, 9)) =>
  goal(p, { type: 'lift', exercise, targetWeight: String(targetWeight), unit, targetReps: String(targetReps) }, when);
const train = (p, week, now) => weekChallenges(p, week, now).find((c) => c.kind === 'train' || c.kind === 'rest');
const liftC = (p, week, now) => weekChallenges(p, week, now).find((c) => c.kind === 'lift');

describe('R13.8 train or rest', () => {
  it('R13.8: with no training goal and a quiet last week, train 2 days', () => {
    const p = start();
    const c = train(p, WEEK_23, at(23));
    expect(c).toMatchObject({ id: 'train', title: 'Train 2 days this week', done: false });
    expect(train(trainOn([23, 24], p), WEEK_23, at(24, 12)).done).toBe(true);
  });

  it('R13.8: two lifts on the same day count as one day', () => {
    const p = trainOn([23, 23]);
    expect(train(p, WEEK_23, at(23, 12)).done).toBe(false);
  });

  it('R13.8: at most one day more than last week, and never past the goal', () => {
    let p = goal(trainOn([16, 18]), { type: 'training', daysPerWeek: 4 });
    expect(train(p, WEEK_23, at(23)).title).toBe('Train 3 days this week');
    p = goal(trainOn([16, 18]), { type: 'training', daysPerWeek: 1 });
    expect(train(p, WEEK_23, at(23)).title).toBe('Train 1 day this week');
  });

  it('R13.8: the largest training goal counts, but never more than 6 days', () => {
    let p = trainOn([16, 17, 18, 19, 20, 21]); // 6 days last week
    p = goal(p, { type: 'training', daysPerWeek: 3 });
    p = goal(p, { type: 'training', daysPerWeek: 7 });
    expect(train(p, WEEK_23, at(23)).title).toBe('Train 6 days this week');
  });

  it('R13.8: after a 7-day week, the challenge is a rest day', () => {
    const p = trainOn([16, 17, 18, 19, 20, 21, 22]);
    const c = train(p, WEEK_23, at(23, 12));
    expect(c).toMatchObject({ id: 'rest', title: 'Take a rest day this week', done: false });
    expect(train(p, WEEK_23, at(24, 12)).done).toBe(true); // Monday ended with no lift
    const busy = trainOn([23], p);
    expect(train(busy, WEEK_23, at(24, 12)).done).toBe(false);
    expect(train(trainOn([24], busy), WEEK_23, at(25, 12)).done).toBe(false);
    expect(train(busy, WEEK_23, at(25, 12)).done).toBe(true); // Tuesday ended with no lift
  });
});

describe('R13.9 small lift steps', () => {
  it('R13.9: with no qualifying lift before the week, log the target reps at any weight', () => {
    const p = liftGoal(start(), 'Squat', 100);
    const c = liftC(p, WEEK_23, at(23, 10));
    expect(c).toMatchObject({ id: `lift:${p.goals[0].id}`, title: 'Squat × 5 reps', done: false });
    expect(liftC(lift(p, ['Squat', 1, 4, 40], at(24)).profile, WEEK_23, at(24)).done).toBe(false);
    expect(liftC(lift(p, ['squat', 1, 5, 40], at(24)).profile, WEEK_23, at(24)).done).toBe(true);
  });

  it('R13.9: a beginner steps up 2.5%, rounded down to 0.5 kg', () => {
    let p = trainOn([23], start(), ['Squat', 3, 5, 60]);
    p = liftGoal(p, 'Squat', 100);
    const c = liftC(p, WEEK_30, at(30));
    expect(c.title).toBe('Squat 61.5 kg × 5');
    expect(liftC(lift(p, ['Squat', 1, 5, 61], at(31)).profile, WEEK_30, at(31)).done).toBe(false);
    expect(liftC(lift(p, ['Squat', 1, 4, 62], at(31)).profile, WEEK_30, at(31)).done).toBe(false);
    expect(liftC(lift(p, ['Squat', 1, 5, 61.5], at(31)).profile, WEEK_30, at(31)).done).toBe(true);
  });

  it('R13.9: intermediate and advanced step up 5%', () => {
    let p = trainOn([23], start(), ['Squat', 3, 5, 60]);
    p = liftGoal(p, 'Squat', 100);
    for (const experience of ['intermediate', 'advanced']) {
      const q = setLimitations(p, { areas: [], equipment: 'gym', experience }, at(30)).profile;
      expect(liftC(q, WEEK_30, at(30)).title).toBe('Squat 63 kg × 5');
    }
  });

  it('R13.9: lb goals round down to 1 lb', () => {
    let p = trainOn([23], start(), ['Bench', 3, 5, 135, 'lb']);
    p = liftGoal(p, 'Bench', 185, 5, 'lb');
    expect(liftC(p, WEEK_30, at(30)).title).toBe('Bench 138 lb × 5'); // 135 × 1.025 = 138.4
  });

  it('R13.9: the step never goes past the goal', () => {
    let p = trainOn([23], start(), ['Squat', 3, 5, 99]);
    p = liftGoal(p, 'Squat', 100);
    expect(liftC(p, WEEK_30, at(30)).title).toBe('Squat 100 kg × 5');
  });

  it('R13.9: when the step is too small to load, it is one more rep instead', () => {
    let p = trainOn([23], start(), ['Curl', 3, 8, 10]);
    p = liftGoal(p, 'Curl', 15, 8);
    expect(liftC(p, WEEK_30, at(30)).title).toBe('Curl 10 kg × 9'); // 10 × 1.025 rounds down to 10
    expect(liftC(lift(p, ['Curl', 1, 9, 10], at(31)).profile, WEEK_30, at(31)).done).toBe(true);
  });

  it('R13.9: the challenge is set from before the week, so it does not move as you log', () => {
    let p = trainOn([23], start(), ['Squat', 3, 5, 60]);
    p = liftGoal(p, 'Squat', 100);
    const before = liftC(p, WEEK_30, at(30)).title;
    p = lift(p, ['Squat', 1, 5, 70], at(31)).profile;
    expect(liftC(p, WEEK_30, at(31)).title).toBe(before);
  });

  it('R13.9: lifts this week from before the goal was created do not count', () => {
    let p = lift(start(), ['Squat', 1, 5, 40], at(23, 8)).profile;
    p = liftGoal(p, 'Squat', 100, 5, 'kg', at(23, 9));
    expect(liftC(p, WEEK_23, at(23, 12)).done).toBe(false);
  });

  it('R13.9 / R13.3: limitations in force that week block a lift challenge; unknown exercises are not blocked', () => {
    let p = liftGoal(start(), 'Back Squat', 100);
    p = liftGoal(p, 'Zercher Squat', 100);
    p = setLimitations(p, { areas: ['knees'], equipment: 'gym', experience: 'beginner' }, at(24)).profile;
    const lifts = weekChallenges(p, WEEK_23, at(24)).filter((c) => c.kind === 'lift');
    expect(lifts.map((c) => c.title)).toEqual(['Zercher Squat × 5 reps']);
  });

  it('R13.9: a goal reached before the week gets no challenge', () => {
    let p = liftGoal(start(), 'Squat', 60);
    p = lift(p, ['Squat', 1, 5, 60], at(24)).profile;
    expect(liftC(p, WEEK_23, at(24))).toBeDefined();
    expect(liftC(p, WEEK_30, at(30))).toBeUndefined();
  });
});

describe('R13.10 healthy body-weight pace', () => {
  const withBw = (target) => goal(addWeighIn(start(), '80', at(23, 8)).profile, { type: 'bodyweight', targetWeight: target });

  it('R13.10: weigh in this week, at most 1% a week when losing', () => {
    const c = weekChallenges(withBw('75'), WEEK_23, at(23, 10)).find((x) => x.kind === 'bodyweight');
    expect(c.title).toBe('Weigh in this week');
    expect(c.detail).toMatch(/0\.8 kg a week toward 75 kg/);
    expect(c.done).toBe(false);
  });

  it('R13.10: at most 0.5% a week when gaining', () => {
    const c = weekChallenges(withBw('85'), WEEK_23, at(23, 10)).find((x) => x.kind === 'bodyweight');
    expect(c.detail).toMatch(/0\.4 kg a week/);
  });

  it('R13.10: the pace is measured from the latest weigh-in before the week', () => {
    let p = withBw('75');
    p = addWeighIn(p, '78', at(26)).profile;
    const c = weekChallenges(p, WEEK_30, at(30)).find((x) => x.kind === 'bodyweight');
    expect(c.detail).toMatch(/0\.8 kg/); // 1% of 78 = 0.78
  });

  it('R13.10: any weigh-in after the goal completes it, whatever the scale says', () => {
    const p = addWeighIn(withBw('75'), '81', at(25)).profile;
    expect(weekChallenges(p, WEEK_23, at(25)).find((x) => x.kind === 'bodyweight').done).toBe(true);
    expect(weekChallenges(withBw('75'), WEEK_23, at(25)).find((x) => x.kind === 'bodyweight').done).toBe(false);
  });
});

describe('R13.7 weekly challenges', () => {
  it('R13.7: at most three, in order: train, body weight, then lift goals oldest first', () => {
    let p = addWeighIn(start(), '80', at(23, 8)).profile;
    p = liftGoal(p, 'Squat', 100, 5, 'kg', at(23, 9));
    p = liftGoal(p, 'Deadlift', 140, 5, 'kg', at(23, 10));
    p = goal(p, { type: 'bodyweight', targetWeight: '75' }, at(23, 11));
    const list = weekChallenges(p, WEEK_23, at(23, 12));
    expect(list.map((c) => c.kind)).toEqual(['train', 'bodyweight', 'lift']);
    expect(list[2].title).toMatch(/^Squat/);
  });

  it('R13.7: each completed challenge is worth +30 XP, added to total XP', () => {
    let p = liftGoal(start(), 'Squat', 100);
    p = trainOn([23, 24], p); // train 2 days + first squat set
    expect(CHALLENGE_XP).toBe(30);
    expect(challengeXp(p, at(24, 12))).toBe(60);
    expect(profileLevel(p, at(24, 12)).totalXp).toBe(summarize(p.entries).totalXp + 60);
  });

  it('R13.7: past weeks keep their challenge XP', () => {
    const p = trainOn([16, 17, 23, 24]);
    expect(challengeXp(p, at(24, 12))).toBe(60);
    expect(challengeXp(p, at(40))).toBe(60);
  });

  it('R13.7: deleting the lift or the goal recalculates challenge XP', () => {
    let p = liftGoal(start(), 'Squat', 100);
    p = trainOn([23, 24], p);
    expect(challengeXp(deleteEntry(p, p.entries[1].id), at(24, 12))).toBe(30);
    expect(challengeXp(deleteGoal(p, p.goals[0].id), at(24, 12))).toBe(30);
  });

  it('R13.7: limitations changed this week recalculate this week; earlier weeks keep theirs', () => {
    let p = liftGoal(start(), 'Squat', 100);
    p = trainOn([23, 24], p);
    const knees = { areas: ['knees'], equipment: 'gym', experience: 'beginner' };
    expect(challengeXp(setLimitations(p, knees, at(25)).profile, at(25))).toBe(30);
    expect(challengeXp(setLimitations(p, knees, at(30)).profile, at(30))).toBe(60);
  });

  it('R13.7: no entries or weigh-ins means no challenge XP', () => {
    expect(challengeXp(start(), at(30))).toBe(0);
    expect(currentChallenges(start(), at(30))).toHaveLength(1);
  });
});

describe('R13.11 pace warning', () => {
  const twoWeighIns = (first, second, target, days = 7) => {
    let p = addWeighIn(start(), String(first), at(16)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: String(target) }, at(16, 11));
    return addWeighIn(p, String(second), at(16 + days)).profile;
  };

  it('R13.11: losing more than 1% a week gives a warning', () => {
    const [w] = paceWarnings(twoWeighIns(80, 78.5, 70));
    expect(w.text).toMatch(/1\.5 kg a week/);
    expect(w.text).toMatch(/0\.8 kg/);
    expect(w.text).toMatch(/eat enough/);
  });

  it('R13.11: a pace within the limit gives no warning', () => {
    expect(paceWarnings(twoWeighIns(80, 79.5, 70))).toEqual([]);
  });

  it('R13.11: gaining more than 0.5% a week gives a warning', () => {
    expect(paceWarnings(twoWeighIns(70, 70.5, 80))).toHaveLength(1);
    expect(paceWarnings(twoWeighIns(70, 70.3, 80))).toEqual([]);
  });

  it('R13.11: change away from the goal gives no warning', () => {
    expect(paceWarnings(twoWeighIns(80, 82, 70))).toEqual([]);
  });

  it('R13.11: with no weigh-in 7 or more days older, no warning', () => {
    expect(paceWarnings(twoWeighIns(80, 76, 70, 6))).toEqual([]);
  });

  it('R13.11: a reached goal gives no warning', () => {
    expect(paceWarnings(twoWeighIns(80, 78, 78.5))).toEqual([]);
  });
});

describe('R13.12 challenge feedback', () => {
  it('R13.12: completing a challenge gives a challenge event and its XP is in the XP event', () => {
    const p = trainOn([23]);
    const { result } = lift(p, ['Squat', 1, 5, 50], at(24));
    expect(result.xpEarned).toBe(25 + 30);
    const events = feedbackFor(result);
    expect(events.map((e) => e.type)).toEqual(['xp', 'challenge']);
    expect(events[1].text).toBe('Challenge done: Train 2 days this week · +30 XP');
  });

  it('R13.12: a challenge already done gives no second event', () => {
    const p = trainOn([23, 24]);
    const { result } = lift(p, ['Squat', 1, 5, 50], at(25));
    expect(result.xpEarned).toBe(25);
    expect(feedbackFor(result).map((e) => e.type)).not.toContain('challenge');
  });
});

describe('R13.14 tone of challenges', () => {
  it('R13.14: challenge and warning texts never shame', () => {
    let p = addWeighIn(trainOn([16, 17, 18, 19, 20, 21, 22]), '80', at(16)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '70' }, at(16, 11));
    p = addWeighIn(p, '77', at(23, 8)).profile;
    p = liftGoal(p, 'Squat', 100, 5, 'kg', at(23, 9));
    const texts = [
      ...weekChallenges(p, WEEK_23, at(23, 12)).flatMap((c) => [c.title, c.detail]),
      ...weekChallenges(trainOn([16]), WEEK_23, at(23, 12)).flatMap((c) => [c.title, c.detail]),
      ...paceWarnings(p).map((w) => w.text),
      ...paceWarnings(twoWeighIns70()).map((w) => w.text),
    ];
    expect(texts.length).toBeGreaterThanOrEqual(8);
    for (const t of texts) expect(t, t).not.toMatch(SHAMING);
  });

  function twoWeighIns70() {
    let p = addWeighIn(start(), '70', at(16)).profile;
    p = goal(p, { type: 'bodyweight', targetWeight: '80' }, at(16, 11));
    return addWeighIn(p, '71', at(23)).profile;
  }
});

it('R13.7: a lift challenge exists only in weeks after the goal is created', () => {
  const p = liftGoal(start(), 'Squat', 100, 5, 'kg', at(30, 9));
  expect(liftC(p, WEEK_16, at(16))).toBeUndefined();
  expect(liftC(p, WEEK_23, at(23))).toBeUndefined();
  expect(liftC(p, WEEK_30, at(30, 10))).toBeDefined();
});
