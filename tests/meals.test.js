import { describe, it, expect } from 'vitest';
import {
  MEALS,
  SLOTS,
  FOOD_GROUPS,
  FOCUSES,
  DIET_RULES,
  ruledOut,
  mealAllowed,
  focusesFor,
  mealSuggestions,
} from '../src/logic/meals.js';
import { DIETS, setLimitations } from '../src/logic/limitations.js';
import { addGoal, toggleHabitDay } from '../src/logic/goals.js';
import { addWeighIn } from '../src/logic/bodyweight.js';
import { profileStats } from '../src/logic/profiles.js';
import { suggestions } from '../src/logic/exercises.js';
import { currentChallenges } from '../src/logic/challenges.js';
import { at, newProfile, lift, SHAMING } from './helpers.js';

const withDiet = (p, diet) =>
  setLimitations(p, { areas: [], equipment: 'gym', experience: 'beginner', diet }, at(23, 9)).profile;
const goal = (p, input, now = at(23, 9)) => {
  const r = addGoal(p, input, now);
  if (!r.ok) throw new Error(r.error);
  return r.profile;
};
const liftGoal = (p, exercise = 'Squat') => goal(p, { type: 'lift', exercise, targetWeight: '140', unit: 'kg', targetReps: '5' });
const bwGoal = (p, targetWeight) => goal(p, { type: 'bodyweight', targetWeight });
const focusIds = (p) => focusesFor(p).map((f) => f.focus);
const byName = new Map(MEALS.map((m) => [m.name, m]));

/** Every combination of diet options (2^6 = 64). */
const allDietCombos = () =>
  Array.from({ length: 2 ** DIETS.length }, (_, mask) => DIETS.filter((_, i) => mask & (1 << i)));

describe('R14.1 diet rules', () => {
  it('R14.1: each diet option rules out its food groups', () => {
    expect(DIET_RULES).toEqual({
      vegetarian: ['meat', 'pork', 'fish'],
      vegan: ['meat', 'pork', 'fish', 'dairy', 'eggs'],
      noDairy: ['dairy'],
      noNuts: ['nuts'],
      noGluten: ['gluten'],
      noPork: ['pork'],
    });
    expect(Object.keys(DIET_RULES)).toEqual(DIETS);
  });

  it('R14.1: several options rule out the union of their groups', () => {
    expect([...ruledOut(['noNuts', 'noPork'])].sort()).toEqual(['nuts', 'pork']);
    expect(ruledOut([]).size).toBe(0);
  });

  it('R14.1: a meal is allowed only when it contains nothing ruled out', () => {
    const meal = { contains: ['dairy', 'gluten'] };
    expect(mealAllowed(meal, [])).toBe(true);
    expect(mealAllowed(meal, ['noPork', 'vegetarian'])).toBe(true);
    expect(mealAllowed(meal, ['noGluten'])).toBe(false);
    expect(mealAllowed(meal, ['vegan'])).toBe(false);
  });
});

describe('R14.2 meal list', () => {
  it('R14.2: every meal has a name, a known slot, known food groups, and known focuses', () => {
    expect(SLOTS).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
    expect(FOOD_GROUPS).toEqual(['meat', 'pork', 'fish', 'dairy', 'eggs', 'nuts', 'gluten']);
    expect(FOCUSES).toEqual(['muscle', 'lean', 'gain', 'fuel']);
    expect(new Set(MEALS.map((m) => m.name)).size).toBe(MEALS.length);
    for (const m of MEALS) {
      expect(m.name.trim().length, m.name).toBeGreaterThan(0);
      expect(SLOTS, m.name).toContain(m.slot);
      for (const g of m.contains) expect(FOOD_GROUPS, m.name).toContain(g);
      expect(m.fits.length, m.name).toBeGreaterThan(0);
      for (const f of m.fits) expect(FOCUSES, m.name).toContain(f);
    }
  });

  it('R14.2: a pork meal also contains meat', () => {
    for (const m of MEALS.filter((x) => x.contains.includes('pork'))) expect(m.contains, m.name).toContain('meat');
  });

  it('R14.2: every focus and slot has a meal that contains none of the food groups', () => {
    for (const focus of FOCUSES) {
      for (const slot of SLOTS) {
        const free = MEALS.some((m) => m.slot === slot && m.fits.includes(focus) && m.contains.length === 0);
        expect(free, `${focus} ${slot}`).toBe(true);
      }
    }
  });

  it('R14.2: spot checks on what meals contain', () => {
    expect(byName.get('Greek yogurt with berries and oats').contains).toEqual(expect.arrayContaining(['dairy', 'gluten']));
    for (const m of MEALS.filter((x) => /peanut|almond|cashew|walnut|mixed nuts/i.test(x.name))) {
      expect(m.contains, m.name).toContain('nuts');
    }
    for (const m of MEALS.filter((x) => /chicken|beef|turkey/i.test(x.name))) expect(m.contains, m.name).toContain('meat');
    for (const m of MEALS.filter((x) => /salmon|tuna/i.test(x.name))) expect(m.contains, m.name).toContain('fish');
    for (const m of MEALS.filter((x) => /pork|ham|bacon/i.test(x.name))) expect(m.contains, m.name).toContain('pork');
  });
});

describe('R14.3 focus from goals', () => {
  it('R14.3: no goals means a fuel focus from no goal', () => {
    expect(focusesFor(newProfile())).toEqual([{ focus: 'fuel', goals: [] }]);
  });

  it('R14.3: an active lift goal gives the muscle focus, naming the goal', () => {
    const p = liftGoal(newProfile());
    expect(focusesFor(p)).toEqual([{ focus: 'muscle', goals: ['Squat'] }]);
  });

  it('R14.3: a body-weight goal below the start gives lean; above the start gives gain', () => {
    const start = newProfile({ bodyWeight: '80' });
    expect(focusIds(bwGoal(start, '75'))).toEqual(['lean']);
    expect(focusIds(bwGoal(start, '85'))).toEqual(['gain']);
  });

  it('R14.3: only the oldest active body-weight goal sets lean or gain', () => {
    let p = newProfile({ bodyWeight: '80' });
    p = goal(p, { type: 'bodyweight', targetWeight: '75' }, at(23, 9));
    p = goal(p, { type: 'bodyweight', targetWeight: '85' }, at(23, 11));
    expect(focusIds(p)).toEqual(['lean']);
  });

  it('R14.3: training and custom-habit goals give the fuel focus', () => {
    const p = goal(goal(newProfile(), { type: 'training', daysPerWeek: '3' }), { type: 'habit', name: 'Sleep 8 hours', daysPerWeek: '5' });
    expect(focusesFor(p)).toEqual([{ focus: 'fuel', goals: ['Train 3 days a week', 'Sleep 8 hours'] }]);
  });

  it('R14.3: focuses come in the order muscle, lean, gain, fuel', () => {
    let p = newProfile({ bodyWeight: '80' });
    p = goal(p, { type: 'training', daysPerWeek: '3' });
    p = bwGoal(p, '75');
    p = liftGoal(p, 'Deadlift');
    expect(focusIds(p)).toEqual(['muscle', 'lean', 'fuel']);
  });

  it('R14.3: reached goals no longer set a focus', () => {
    let p = liftGoal(newProfile(), 'Squat');
    p = goal(p, { type: 'habit', name: 'Walk', daysPerWeek: '1' });
    p = lift(p, ['Squat', 3, 5, 140], at(24)).profile;
    expect(focusesFor(p)).toEqual([{ focus: 'fuel', goals: ['Walk'] }]);
    p = toggleHabitDay(p, p.goals[1].id, '2026-11-24', at(24, 20)).profile;
    expect(focusesFor(p)).toEqual([{ focus: 'fuel', goals: [] }]);
  });

  it('R14.3: a lost-weight goal that has been reached stops the lean focus', () => {
    let p = bwGoal(newProfile({ bodyWeight: '80' }), '79');
    p = addWeighIn(p, '78.5', at(25)).profile;
    expect(focusIds(p)).toEqual(['fuel']);
  });
});

describe('R14.4 suggested meals', () => {
  it('R14.4: one meal per slot for each focus, breakfast to snack, each saying why', () => {
    const p = bwGoal(liftGoal(newProfile({ bodyWeight: '80' })), '75');
    const out = mealSuggestions(p);
    expect(out.map((f) => f.focus)).toEqual(['muscle', 'lean']);
    for (const f of out) {
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.why.length).toBeGreaterThan(0);
      expect(f.meals.map((m) => m.slot)).toEqual(SLOTS);
      for (const m of f.meals) expect(byName.get(m.name).fits).toContain(f.focus);
    }
    expect(out[0].goals).toEqual(['Squat']);
    expect(out[0].why).toMatch(/protein/i);
  });

  it('R14.4: with no diet, each slot gets the first meal in list order that fits', () => {
    for (const focus of FOCUSES) {
      let p = newProfile({ bodyWeight: '80' });
      if (focus === 'muscle') p = liftGoal(p);
      if (focus === 'lean') p = bwGoal(p, '75');
      if (focus === 'gain') p = bwGoal(p, '85');
      const [f] = mealSuggestions(p);
      expect(f.focus).toBe(focus);
      const expected = SLOTS.map((slot) => MEALS.find((m) => m.slot === slot && m.fits.includes(focus)).name);
      expect(f.meals.map((m) => m.name)).toEqual(expected);
    }
  });

  it('R14.4: no suggestion ever contains something the diet rules out, for every diet combination and focus', () => {
    let p = newProfile({ bodyWeight: '80' });
    p = goal(liftGoal(p), { type: 'training', daysPerWeek: '3' });
    const lean = bwGoal(p, '75');
    const gain = bwGoal(p, '85');
    for (const diet of allDietCombos()) {
      const banned = ruledOut(diet);
      for (const base of [lean, gain]) {
        const out = mealSuggestions(withDiet(base, diet));
        expect(out).toHaveLength(3);
        for (const f of out) {
          expect(f.meals, `${diet} ${f.focus}`).toHaveLength(SLOTS.length);
          for (const m of f.meals) {
            const contains = byName.get(m.name).contains;
            expect(contains.filter((g) => banned.has(g)), `${diet.join('+')} → ${m.name}`).toEqual([]);
          }
        }
      }
    }
  });

  it('R14.4: a vegan with no nuts and no gluten still gets a full plan', () => {
    const p = withDiet(liftGoal(newProfile()), ['vegan', 'noNuts', 'noGluten']);
    const [f] = mealSuggestions(p);
    expect(f.meals).toHaveLength(4);
    for (const m of f.meals) expect(byName.get(m.name).contains).toEqual([]);
  });

  it('R14.4: the diet in use is the current one', () => {
    let p = withDiet(liftGoal(newProfile()), ['vegetarian']);
    p = setLimitations(p, { areas: [], equipment: 'gym', experience: 'beginner', diet: [] }, at(31)).profile;
    const names = mealSuggestions(p)[0].meals.map((m) => m.name);
    expect(names.some((n) => byName.get(n).contains.some((g) => ['meat', 'fish'].includes(g)))).toBe(true);
  });
});

describe('R14.6 suggest only', () => {
  it('R14.6: suggesting meals does not change the profile, XP, or level', () => {
    const p = withDiet(liftGoal(newProfile()), ['vegan']);
    const before = JSON.stringify(p);
    const stats = profileStats(p, at(26));
    mealSuggestions(p);
    expect(JSON.stringify(p)).toBe(before);
    expect(profileStats(p, at(26))).toEqual(stats);
  });

  it('R14.6 / R13.1: diet changes no XP, exercise suggestion, or challenge', () => {
    let p = liftGoal(newProfile());
    p = lift(p, ['Squat', 3, 5, 100], at(24)).profile;
    const plain = withDiet(p, []);
    const vegan = withDiet(p, ['vegan', 'noGluten']);
    expect(profileStats(vegan, at(26))).toEqual(profileStats(plain, at(26)));
    expect(suggestions(vegan)).toEqual(suggestions(plain));
    expect(currentChallenges(vegan, at(26))).toEqual(currentChallenges(plain, at(26)));
  });

  it('R14.6: every meal message passes the no-shaming check', () => {
    let p = newProfile({ bodyWeight: '80' });
    p = goal(liftGoal(p), { type: 'training', daysPerWeek: '3' });
    const texts = [];
    for (const base of [newProfile(), bwGoal(p, '75'), bwGoal(p, '85')]) {
      for (const f of mealSuggestions(base)) texts.push(f.title, f.why, ...f.meals.map((m) => m.name));
    }
    for (const m of MEALS) texts.push(m.name);
    expect(texts.length).toBeGreaterThan(10);
    for (const t of texts) expect(t).not.toMatch(SHAMING);
  });
});
