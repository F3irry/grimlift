// XP, personal bests, level, and feedback (spec R2, R3, R6).
// Totals are always derived by replaying a profile's entries in order.
import { normalizeName, validateEntry } from './entries.js';
import { toKg } from './units.js';

export const BASE_XP = 20;
export const XP_PER_SET = 5;
export const XP_PER_LEVEL = 100;
const SAME_WEIGHT_KG = 0.01;

/** R2.1 */
export function xpForEntry(sets) {
  return BASE_XP + XP_PER_SET * sets;
}

/** R2.2 */
export function xpLevels(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL);
}

/** R2.3: XP gained inside the current XP level. */
export function xpProgress(totalXp) {
  return { current: totalXp % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

/** R3.4 */
export function levelFor(totalXp, pbLevels) {
  return 1 + xpLevels(totalXp) + pbLevels;
}

/** R3.1: heavier (in kg) wins; within 0.01 kg, more reps wins. */
export function isBetter(candidate, best) {
  const diff = toKg(candidate.weight, candidate.unit) - toKg(best.weight, best.unit);
  if (Math.abs(diff) >= SAME_WEIGHT_KG) return diff > 0;
  return candidate.reps > best.reps;
}

/**
 * Replay entries to get totals. `bests` maps normalized name →
 * { name, weight, reps, unit, kg }, where name is the first typed name (R1.3).
 */
export function summarize(entries) {
  let totalXp = 0;
  let pbLevels = 0;
  const bests = {};
  const pbIds = new Set();

  for (const e of entries) {
    totalXp += xpForEntry(e.sets);
    const key = normalizeName(e.exercise);
    const prev = bests[key];
    if (!prev || isBetter(e, prev)) {
      if (prev) {
        pbLevels += 1; // R3.3
        pbIds.add(e.id);
      }
      bests[key] = {
        name: prev ? prev.name : e.exercise, // R3.2: first entry is only a baseline
        weight: e.weight,
        reps: e.reps,
        unit: e.unit,
        kg: toKg(e.weight, e.unit),
      };
    }
  }

  return { totalXp, pbLevels, level: levelFor(totalXp, pbLevels), bests, pbIds };
}

function newId(now) {
  return `e${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * R1, R2.1, R3: validate and log an entry into `profile`.
 * Returns { ok: false, profile, error } or { ok: true, profile, result }.
 */
export function logEntry(profile, input, now = new Date()) {
  const v = validateEntry(input);
  if (!v.ok) return { ok: false, profile, error: v.error };

  const entry = { id: newId(now), loggedAt: now.toISOString(), ...v.entry };
  const before = summarize(profile.entries);
  const next = { ...profile, entries: [...profile.entries, entry] };
  const after = summarize(next.entries);
  const best = after.bests[normalizeName(entry.exercise)];

  return {
    ok: true,
    profile: next,
    result: {
      entry,
      exerciseName: best.name,
      xpEarned: xpForEntry(entry.sets),
      personalBest: after.pbIds.has(entry.id),
      levelBefore: before.level,
      levelAfter: after.level,
      totalXp: after.totalXp,
    },
  };
}

/** R1.4: remove an entry; totals follow automatically because they are derived. */
export function deleteEntry(profile, entryId) {
  return { ...profile, entries: profile.entries.filter((e) => e.id !== entryId) };
}

/** R6.1: feedback events for one logged entry, in display order. */
export function feedbackFor(result) {
  const events = [{ type: 'xp', amount: result.xpEarned, text: `+${result.xpEarned} XP` }];
  if (result.personalBest) {
    const { weight, reps, unit } = result.entry;
    events.push({
      type: 'pb',
      exercise: result.exerciseName,
      weight,
      reps,
      unit,
      text: `New personal best: ${result.exerciseName} ${weight} ${unit} × ${reps}`,
    });
  }
  if (result.levelAfter > result.levelBefore) {
    events.push({ type: 'level', level: result.levelAfter, text: `Level ${result.levelAfter}` });
  }
  return events;
}
