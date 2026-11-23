// Shared builders for tests. Dates use local time so tests pass in any timezone.
// 23 Nov 2026 is a Monday: weeks are 23–29 Nov and 30 Nov–6 Dec.
import { createApp, createProfile, activeProfile } from '../src/logic/profiles.js';
import { logEntry } from '../src/logic/progression.js';

/** Local date in Nov/Dec 2026: at(23) is Monday 23 Nov, at(31) is 1 Dec. */
export const at = (day, hour = 10) => new Date(2026, 10, day, hour);

export function newProfile(input = {}, now = at(23, 8)) {
  const r = createProfile(createApp(), { name: 'Ash', ...input }, now);
  if (!r.ok) throw new Error(r.error);
  return activeProfile(r.app);
}

/** Log [exercise, sets, reps, weight, unit?] into a profile at a given time. */
export function lift(profile, [exercise, sets, reps, weight, unit = 'kg'], now) {
  const r = logEntry(profile, { exercise, sets, reps, weight, unit }, now);
  if (!r.ok) throw new Error(r.error);
  return r;
}

/** R12.4 / R13.14: words no message may use. A floor, not a guarantee: read new messages yourself. */
export const SHAMING = /\b(lazy|weak|weakling|pathetic|loser|quit(ter)?|failure|failed|soft|excuses?-?maker|disappoint\w*|worthless|useless|stupid|shame\w*|embarrass\w*|joke|coward)\b/i;
