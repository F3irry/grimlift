// Meal suggestions from goals (spec R14). Suggest only: nothing here is stored or earns XP.
import { isReached } from './goals.js';
import { currentLimitations } from './limitations.js';
import { formatWeight } from './units.js';

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
export const FOOD_GROUPS = ['meat', 'pork', 'fish', 'dairy', 'eggs', 'nuts', 'gluten'];
export const FOCUSES = ['muscle', 'lean', 'gain', 'fuel'];

/** R14.1: what each diet option rules out. Peanuts count as nuts. */
export const DIET_RULES = {
  vegetarian: ['meat', 'pork', 'fish'],
  vegan: ['meat', 'pork', 'fish', 'dairy', 'eggs'],
  noDairy: ['dairy'],
  noNuts: ['nuts'],
  noGluten: ['gluten'],
  noPork: ['pork'],
};

/** R14.3: heading and why-it-fits for each focus. */
export const FOCUS_INFO = {
  muscle: { title: 'Built for muscle', why: 'High in protein, which helps muscle repair and grow.' },
  lean: { title: 'Lean and full', why: 'Filling, with protein and fibre, for fewer calories.' },
  gain: { title: 'Bulk it up', why: 'Energy-dense, so eating a bit more each day is easier.' },
  fuel: { title: 'Fuel the work', why: 'Carbs and protein to power training and recovery.' },
};

const meal = (name, slot, contains, fits) => ({ name, slot, contains, fits });

/**
 * R14.2. List order is suggestion order (R14.4). `contains` errs on the cautious
 * side (oats count as gluten). The meals with nothing in `contains` keep every
 * diet combination covered; a test checks that.
 */
export const MEALS = [
  // breakfast
  meal('Greek yogurt with berries and oats', 'breakfast', ['dairy', 'gluten'], ['muscle', 'lean']),
  meal('Scrambled eggs on wholegrain toast', 'breakfast', ['eggs', 'gluten'], ['muscle', 'fuel']),
  meal('Peanut butter banana oats made with milk', 'breakfast', ['nuts', 'dairy', 'gluten'], ['gain', 'fuel']),
  meal('Tofu scramble with spinach and peppers', 'breakfast', [], ['muscle', 'lean']),
  meal('Sweet potato and black bean hash with avocado', 'breakfast', [], ['gain', 'fuel']),
  // lunch
  meal('Grilled chicken, rice, and vegetables', 'lunch', ['meat'], ['muscle', 'fuel']),
  meal('Tuna and white bean salad', 'lunch', ['fish'], ['lean', 'muscle']),
  meal('Turkey, cheese, and avocado wholegrain wrap', 'lunch', ['meat', 'dairy', 'gluten'], ['gain', 'muscle']),
  meal('Lentil and quinoa bowl with roasted vegetables', 'lunch', [], ['muscle', 'lean', 'fuel']),
  meal('Rice, black bean, corn, and avocado bowl', 'lunch', [], ['gain', 'fuel']),
  // dinner
  meal('Salmon, sweet potato, and greens', 'dinner', ['fish'], ['muscle', 'fuel']),
  meal('Lean beef and bean chili', 'dinner', ['meat'], ['muscle', 'lean']),
  meal('Pork tenderloin with roasted potatoes and green beans', 'dinner', ['meat', 'pork'], ['muscle', 'fuel']),
  meal('Pasta with beef bolognese and parmesan', 'dinner', ['meat', 'dairy', 'gluten'], ['gain', 'fuel']),
  meal('Tofu and vegetable stir-fry with rice and gluten-free tamari', 'dinner', [], ['muscle', 'fuel']),
  meal('Lentil soup with a big green salad', 'dinner', [], ['lean']),
  meal('Chickpea and coconut curry with rice', 'dinner', [], ['gain']),
  // snack
  meal('Cottage cheese with pineapple', 'snack', ['dairy'], ['muscle', 'lean']),
  meal('Hard-boiled eggs and an apple', 'snack', ['eggs'], ['muscle', 'lean']),
  meal('Mixed nuts and dried fruit', 'snack', ['nuts'], ['gain']),
  meal('Chocolate milk', 'snack', ['dairy'], ['fuel']),
  meal('Edamame with sea salt', 'snack', [], ['muscle', 'lean']),
  meal('Hummus with carrot and cucumber sticks', 'snack', [], ['lean']),
  meal('Banana with sunflower-seed butter', 'snack', [], ['fuel', 'gain']),
];

/** R14.1: the food groups a diet rules out. */
export function ruledOut(diet) {
  return new Set(diet.flatMap((d) => DIET_RULES[d] ?? []));
}

/** R14.1: a meal is allowed when it contains nothing the diet rules out. */
export function mealAllowed(m, diet) {
  const banned = ruledOut(diet);
  return !m.contains.some((g) => banned.has(g));
}

function goalLabel(g, profile) {
  if (g.type === 'lift') return g.exercise;
  if (g.type === 'bodyweight') return `Reach ${formatWeight(g.targetKg, profile.unit)}`;
  if (g.type === 'training') return `Train ${g.daysPerWeek} day${g.daysPerWeek === 1 ? '' : 's'} a week`;
  return g.name;
}

/** R14.3: focuses from active goals, in FOCUSES order, each with the goals behind it. */
export function focusesFor(profile) {
  const active = profile.goals.filter((g) => !isReached(g, profile));
  const label = (g) => goalLabel(g, profile);
  const out = [];
  const lifts = active.filter((g) => g.type === 'lift');
  if (lifts.length) out.push({ focus: 'muscle', goals: lifts.map(label) });
  const bw = active.find((g) => g.type === 'bodyweight'); // goals are stored oldest first
  if (bw) out.push({ focus: bw.targetKg < bw.startKg ? 'lean' : 'gain', goals: [label(bw)] });
  const habits = active.filter((g) => g.type === 'training' || g.type === 'habit');
  if (habits.length || !active.length) out.push({ focus: 'fuel', goals: habits.map(label) });
  return out;
}

/** R14.4: one allowed meal per slot for each focus. */
export function mealSuggestions(profile) {
  const { diet } = currentLimitations(profile);
  return focusesFor(profile).map(({ focus, goals }) => ({
    focus,
    goals,
    ...FOCUS_INFO[focus],
    meals: SLOTS.map((slot) => MEALS.find((m) => m.slot === slot && m.fits.includes(focus) && mealAllowed(m, diet)))
      .filter(Boolean)
      .map((m) => ({ slot: m.slot, slotLabel: SLOT_LABELS[m.slot], name: m.name })),
  }));
}
