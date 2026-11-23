// Built-in exercise catalog and suggestions by body part (spec R13.2–R13.6).
import { normalizeName } from './entries.js';
import { isReached } from './goals.js';
import { AREA_LABELS, EQUIPMENT_LABELS, currentLimitations, hasEquipment } from './limitations.js';

export const BODY_PARTS = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core'];
export const BODY_PART_LABELS = {
  legs: 'Legs', back: 'Back', chest: 'Chest', shoulders: 'Shoulders', arms: 'Arms', core: 'Core',
};
export const SETS_BY_EXPERIENCE = { beginner: 2, intermediate: 3, advanced: 4 };
export const REPS = { general: '8–12', losing: '12–15', hold: '20–40 s' };

const ex = (name, bodyPart, equipment, loads, more = {}) => ({ name, bodyPart, equipment, loads, aka: [], hold: false, ...more });

/**
 * R13.2. Order within a body part is the default suggestion order (R13.4).
 * `loads` lists the protected areas (R13.1) an exercise puts real strain on.
 */
export const CATALOG = [
  // legs
  ex('Back Squat', 'legs', 'gym', ['knees', 'hips', 'lowerBack'], { aka: ['squat', 'barbell squat'] }),
  ex('Romanian Deadlift', 'legs', 'gym', ['lowerBack', 'hips'], { aka: ['rdl'] }),
  ex('Leg Press', 'legs', 'gym', ['knees', 'hips']),
  ex('Lying Leg Curl', 'legs', 'gym', ['knees'], { aka: ['leg curl', 'hamstring curl'] }),
  ex('Goblet Squat', 'legs', 'dumbbells', ['knees', 'hips']),
  ex('Dumbbell Romanian Deadlift', 'legs', 'dumbbells', ['lowerBack', 'hips'], { aka: ['dumbbell rdl'] }),
  ex('Bodyweight Squat', 'legs', 'bodyweight', ['knees', 'hips'], { aka: ['air squat'] }),
  ex('Glute Bridge', 'legs', 'bodyweight', ['hips']),
  ex('Calf Raise', 'legs', 'bodyweight', []),
  // back
  ex('Lat Pulldown', 'back', 'gym', ['shoulders', 'elbows']),
  ex('Seated Cable Row', 'back', 'gym', ['elbows'], { aka: ['cable row'] }),
  ex('Deadlift', 'back', 'gym', ['lowerBack', 'hips', 'knees'], { aka: ['conventional deadlift'] }),
  ex('Barbell Row', 'back', 'gym', ['lowerBack', 'elbows'], { aka: ['bent over row', 'bent-over row'] }),
  ex('One-Arm Dumbbell Row', 'back', 'dumbbells', ['elbows'], { aka: ['dumbbell row'] }),
  ex('Superman Hold', 'back', 'bodyweight', ['lowerBack'], { aka: ['superman'], hold: true }),
  ex('Prone Y Raise', 'back', 'bodyweight', ['shoulders']),
  // chest
  ex('Barbell Bench Press', 'chest', 'gym', ['shoulders', 'elbows', 'wrists'], { aka: ['bench press', 'bench'] }),
  ex('Machine Chest Press', 'chest', 'gym', ['shoulders', 'elbows'], { aka: ['chest press'] }),
  ex('Dumbbell Bench Press', 'chest', 'dumbbells', ['shoulders', 'elbows']),
  ex('Dumbbell Floor Press', 'chest', 'dumbbells', ['elbows'], { aka: ['floor press'] }),
  ex('Push-up', 'chest', 'bodyweight', ['shoulders', 'elbows', 'wrists'], { aka: ['pushup', 'push up', 'push-ups', 'pushups'] }),
  ex('Incline Push-up', 'chest', 'bodyweight', ['elbows', 'wrists'], { aka: ['incline pushup'] }),
  // shoulders
  ex('Overhead Press', 'shoulders', 'gym', ['shoulders', 'lowerBack', 'elbows', 'wrists'], { aka: ['ohp', 'military press', 'shoulder press'] }),
  ex('Face Pull', 'shoulders', 'gym', ['elbows']),
  ex('Seated Dumbbell Press', 'shoulders', 'dumbbells', ['shoulders', 'elbows'], { aka: ['dumbbell shoulder press'] }),
  ex('Lateral Raise', 'shoulders', 'dumbbells', ['shoulders'], { aka: ['side raise', 'dumbbell lateral raise'] }),
  ex('Pike Push-up', 'shoulders', 'bodyweight', ['shoulders', 'elbows', 'wrists'], { aka: ['pike pushup'] }),
  // arms
  ex('Barbell Curl', 'arms', 'gym', ['elbows', 'wrists']),
  ex('Cable Triceps Pushdown', 'arms', 'gym', ['elbows'], { aka: ['triceps pushdown', 'tricep pushdown'] }),
  ex('Dumbbell Curl', 'arms', 'dumbbells', ['elbows', 'wrists'], { aka: ['bicep curl', 'biceps curl', 'curl'] }),
  ex('Hammer Curl', 'arms', 'dumbbells', ['elbows']),
  ex('Overhead Triceps Extension', 'arms', 'dumbbells', ['elbows', 'shoulders'], { aka: ['overhead tricep extension'] }),
  ex('Bench Dip', 'arms', 'bodyweight', ['shoulders', 'elbows', 'wrists'], { aka: ['bench dips'] }),
  ex('Diamond Push-up', 'arms', 'bodyweight', ['shoulders', 'elbows', 'wrists'], { aka: ['diamond pushup'] }),
  // core
  ex('Plank', 'core', 'bodyweight', ['shoulders', 'elbows'], { hold: true }),
  ex('Dead Bug', 'core', 'bodyweight', []),
  ex('Side Plank', 'core', 'bodyweight', ['shoulders', 'elbows'], { hold: true }),
  ex('Bird Dog', 'core', 'bodyweight', ['wrists', 'knees']),
  ex('Cable Pallof Press', 'core', 'gym', [], { aka: ['pallof press'] }),
  ex('Hanging Knee Raise', 'core', 'gym', ['shoulders', 'elbows']),
];

const BY_NAME = new Map();
for (const e of CATALOG) for (const n of [e.name, ...e.aka]) BY_NAME.set(normalizeName(n), e);

/** R13.2: the catalog exercise a typed name refers to, or null. */
export function findExercise(name) {
  return BY_NAME.get(normalizeName(name)) ?? null;
}

/** R13.3: why `exercise` isn't allowed under `limits`, or null if it is. */
export function blockReason(exercise, limits) {
  if (!hasEquipment(limits, exercise.equipment)) return { equipment: exercise.equipment };
  const area = exercise.loads.find((a) => limits.areas.includes(a));
  return area ? { area } : null;
}

/** R13.3: limitations always win. */
export function isAllowed(exercise, limits) {
  return blockReason(exercise, limits) === null;
}

const activeGoals = (profile, type) => profile.goals.filter((g) => g.type === type && !isReached(g, profile));

/** R13.5: "sets × reps" for a catalog exercise. */
export function prescription(exercise, profile, limits = currentLimitations(profile)) {
  const sets = SETS_BY_EXPERIENCE[limits.experience];
  const goal = activeGoals(profile, 'lift').find((g) => findExercise(g.exercise) === exercise);
  let reps;
  if (goal) reps = String(goal.targetReps);
  else if (exercise.hold) reps = REPS.hold;
  else if (activeGoals(profile, 'bodyweight').some((g) => g.targetKg < g.startKg)) reps = REPS.losing;
  else reps = REPS.general;
  return { sets, reps, text: `${sets} × ${reps}` };
}

/** R13.4: up to two allowed exercises per body part (one with no goals). */
export function suggestions(profile) {
  const limits = currentLimitations(profile);
  const perPart = profile.goals.length ? 2 : 1;
  // Catalog exercise → the name the user typed for it (goal first, then the log), so
  // logging a suggestion counts toward the same goal and record.
  const typed = new Map();
  const note = (name) => {
    const e = findExercise(name);
    if (e && !typed.has(e)) typed.set(e, name);
    return e;
  };
  const goalExercises = activeGoals(profile, 'lift').map((g) => note(g.exercise)).filter(Boolean);
  const logged = profile.entries.map((e) => note(e.exercise)).filter(Boolean);
  const ranked = [...new Set([...goalExercises, ...logged, ...CATALOG])];
  return BODY_PARTS.map((bodyPart) => {
    const picks = ranked.filter((e) => e.bodyPart === bodyPart && isAllowed(e, limits)).slice(0, perPart);
    return {
      bodyPart,
      label: BODY_PART_LABELS[bodyPart],
      items: picks.map((e) => ({ name: typed.get(e) ?? e.name, prescription: prescription(e, profile, limits).text })),
      message: picks.length
        ? null
        : `Nothing for ${bodyPart} fits your limitations right now. Rest that area, or ask a professional what's safe for you.`,
    };
  });
}

/** R13.6: notes for active lift goals that the current limitations block. */
export function blockedGoals(profile) {
  const limits = currentLimitations(profile);
  const notes = [];
  for (const g of activeGoals(profile, 'lift')) {
    const exercise = findExercise(g.exercise);
    const reason = exercise && blockReason(exercise, limits);
    if (!reason) continue;
    const why = reason.area
      ? `loads your ${AREA_LABELS[reason.area]}, which you're protecting`
      : `needs ${EQUIPMENT_LABELS[reason.equipment]}, which you don't have`;
    const alt = CATALOG.find((e) => e.bodyPart === exercise.bodyPart && isAllowed(e, limits)) ?? null;
    const next = alt
      ? `Train ${exercise.bodyPart} with ${alt.name} instead for now.`
      : `Nothing for ${exercise.bodyPart} fits right now. Rest that area, or ask a professional what's safe for you.`;
    notes.push({ goalId: g.id, exercise: g.exercise, alternative: alt ? alt.name : null, text: `Your ${g.exercise} goal ${why}, so it's on hold. ${next}` });
  }
  return notes;
}
