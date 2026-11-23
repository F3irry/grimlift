// Weekly training streaks and tough love when they break (spec R12).
// Everything here is derived from entries, so nothing new is stored.
import { dayKey, parseDayKey, weekKey } from './dates.js';

export const COMEBACK_XP = 50;
export const MIN_BROKEN_STREAK = 2;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Week key `n` weeks after (or before, if negative) the week key `key`. */
function shiftWeek(key, n) {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + 7 * n);
  return dayKey(d);
}

/** Whole weeks from week key `a` to week key `b` (rounded, so DST shifts don't matter). */
function weeksBetween(a, b) {
  return Math.round((parseDayKey(b) - parseDayKey(a)) / WEEK_MS);
}

const entryWeek = (e) => weekKey(new Date(e.loggedAt));

/** Length of the run of training weeks in `weeks` that ends at `week`. */
function runEndingAt(weeks, week) {
  let n = 0;
  for (let w = week; weeks.has(w); w = shiftWeek(w, -1)) n += 1;
  return n;
}

/**
 * R12.5: comeback entries, as a Map of entry id → lost streak (weeks).
 * An entry is a comeback when it comes two or more weeks after the previous
 * entry's week and the run ending in that week was at least 2 weeks.
 */
export function comebacks(entries) {
  const found = new Map();
  const seen = new Set();
  let lastWeek = null;
  for (const e of entries) {
    const week = entryWeek(e);
    if (lastWeek && weeksBetween(lastWeek, week) >= 2) {
      const run = runEndingAt(seen, lastWeek);
      if (run >= MIN_BROKEN_STREAK) found.set(e.id, run);
    }
    seen.add(week);
    if (!lastWeek || week > lastWeek) lastWeek = week;
  }
  return found;
}

/** R12.1, R12.2: current streak, best streak, and whether a streak is broken. */
export function streakStatus(entries, now = new Date()) {
  const weeks = new Set(entries.map(entryWeek));
  if (!weeks.size) return { current: 0, best: 0, broken: false, lostWeeks: 0 };

  let best = 0;
  for (const w of weeks) {
    if (!weeks.has(shiftWeek(w, -1))) best = Math.max(best, runLengthFrom(weeks, w));
  }

  const thisWeek = weekKey(now);
  const lastWeek = shiftWeek(thisWeek, -1);
  let current = 0;
  if (weeks.has(thisWeek)) current = runEndingAt(weeks, thisWeek);
  else if (weeks.has(lastWeek)) current = runEndingAt(weeks, lastWeek);

  let broken = false;
  let lostWeeks = 0;
  if (current === 0) {
    const latest = [...weeks].sort().at(-1);
    const run = runEndingAt(weeks, latest);
    if (weeksBetween(latest, thisWeek) >= 2 && run >= MIN_BROKEN_STREAK) {
      broken = true;
      lostWeeks = run;
    }
  }
  return { current, best, broken, lostWeeks };
}

/** Length of the run of training weeks that starts at `week`. */
function runLengthFrom(weeks, week) {
  let n = 0;
  for (let w = week; weeks.has(w); w = shiftWeek(w, 1)) n += 1;
  return n;
}

// R12.3, R12.4: tough love. Each one challenges; none insults.
export const TOUGH_LOVE_MESSAGES = [
  (n) => `${n} weeks in a row, then the bar went quiet. You built that streak once, so you know exactly what it takes. Get back under the bar.`,
  (n) => `Your streak of ${n} weeks is over. Streaks end; your training doesn't have to. Show up today and start the next one.`,
  (n) => `The streak broke after ${n} weeks. The strength you built is still there. Come back and prove it.`,
  (n) => `${n} weeks of showing up, then a week off the books. That's history now. What you do this week is what counts. Log a lift.`,
];

/** R12.3: the banner for a broken streak of `lostWeeks` weeks. */
export function toughLove(lostWeeks) {
  const pick = TOUGH_LOVE_MESSAGES[lostWeeks % TOUGH_LOVE_MESSAGES.length];
  return {
    title: 'Your streak broke.',
    message: pick(lostWeeks),
    challenge: `Your first lift back earns +${COMEBACK_XP} XP. Then beat ${lostWeeks} weeks.`,
  };
}

/** R12.6: the comeback alert text. */
export function comebackText(lostWeeks) {
  return `Comeback: +${COMEBACK_XP} bonus XP. You held ${lostWeeks} weeks before. Now beat it.`;
}
