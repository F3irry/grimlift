import { describe, it, expect } from 'vitest';
import {
  streakStatus,
  comebacks,
  toughLove,
  comebackText,
  TOUGH_LOVE_MESSAGES,
  COMEBACK_XP,
} from '../src/logic/streaks.js';
import { summarize, feedbackFor, deleteEntry, xpForEntry } from '../src/logic/progression.js';
import { profileStats } from '../src/logic/profiles.js';
import { at, newProfile, lift } from './helpers.js';

// Mondays in Nov/Dec 2026: 2, 9, 16, 23, 30 Nov; at(37) is Mon 7 Dec, at(44) is Mon 14 Dec.

/** Log one Squat (1 set) on each given at() day; returns the profile and the last result. */
function train(days, profile = newProfile({}, at(1, 8))) {
  let result;
  for (const day of days) {
    const r = lift(profile, ['Squat', 1, 5, 100], at(day));
    profile = r.profile;
    result = r.result;
  }
  return { profile, result };
}

describe('R12.1 current and best streak', () => {
  it('R12.1: no entries means a streak of 0', () => {
    const s = streakStatus([], at(23));
    expect(s).toMatchObject({ current: 0, best: 0, broken: false });
  });

  it('R12.1: consecutive training weeks count once each, however many days', () => {
    const { profile } = train([2, 4, 9, 16, 17, 18]);
    expect(streakStatus(profile.entries, at(19)).current).toBe(3);
  });

  it('R12.1: the streak stays alive through the current week before you train in it', () => {
    const { profile } = train([2, 9, 16]);
    expect(streakStatus(profile.entries, at(29)).current).toBe(3); // Sunday of the next week
  });

  it('R12.1: once a whole week passes with no entry the current streak is 0', () => {
    const { profile } = train([2, 9, 16]);
    expect(streakStatus(profile.entries, at(30)).current).toBe(0); // Monday two weeks on
  });

  it('R12.1: best streak is the longest run ever', () => {
    const { profile } = train([2, 9, 16, 30, 37]);
    const s = streakStatus(profile.entries, at(37));
    expect(s.current).toBe(2);
    expect(s.best).toBe(3);
  });

  it('R12.1: deleting an entry recalculates the streak', () => {
    const { profile } = train([2, 9, 16]);
    const middle = profile.entries[1].id;
    const s = streakStatus(deleteEntry(profile, middle).entries, at(16));
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });
});

describe('R12.2 broken streak', () => {
  it('R12.2: a 2+ week run followed by a whole empty week is broken', () => {
    const { profile } = train([2, 9, 16]);
    const s = streakStatus(profile.entries, at(30));
    expect(s.broken).toBe(true);
    expect(s.lostWeeks).toBe(3);
  });

  it('R12.2: it is not broken while the following week is still in progress', () => {
    const { profile } = train([2, 9]);
    expect(streakStatus(profile.entries, at(22, 23)).broken).toBe(false);
  });

  it('R12.2: a 1-week run followed by a gap is not a broken streak', () => {
    const { profile } = train([2]);
    expect(streakStatus(profile.entries, at(30)).broken).toBe(false);
  });

  it('R12.2: logging again ends the broken state', () => {
    const { profile } = train([2, 9, 30]);
    const s = streakStatus(profile.entries, at(30, 12));
    expect(s.broken).toBe(false);
    expect(s.current).toBe(1);
  });

  it('R12.2: a broken streak stays broken however long the gap', () => {
    const { profile } = train([2, 9]);
    const s = streakStatus(profile.entries, at(60));
    expect(s).toMatchObject({ broken: true, lostWeeks: 2 });
  });
});

describe('R12.3 / R12.4 tough-love messages', () => {
  const SHAMING = /\b(lazy|weak|weakling|pathetic|loser|quit(ter)?|failure|failed|soft|excuses?-?maker|disappoint\w*|worthless|useless|stupid|shame\w*|embarrass\w*|joke|coward)\b/i;
  const CHALLENGE = /\b(log|come back|back|beat|show up|start|get)\b/i;

  it('R12.3: the banner names the lost streak and the +50 XP challenge', () => {
    const t = toughLove(4);
    expect(t.title.length).toBeGreaterThan(0);
    expect(t.message).toMatch(/\b4 weeks\b/);
    expect(t.challenge).toMatch(/\+50 XP/);
    expect(t.challenge).toMatch(/\b4 weeks\b/);
  });

  it('R12.3: the same lost streak always gives the same message', () => {
    expect(toughLove(5)).toEqual(toughLove(5));
  });

  it('R12.3: different lost streaks can give different messages', () => {
    const msgs = new Set([2, 3, 4, 5, 6, 7, 8].map((n) => toughLove(n).message.replace(/\d+/g, '#')));
    expect(msgs.size).toBeGreaterThan(1);
  });

  it('R12.4: every message challenges the user to act', () => {
    expect(TOUGH_LOVE_MESSAGES.length).toBeGreaterThanOrEqual(3);
    for (let n = 2; n < 2 + TOUGH_LOVE_MESSAGES.length; n += 1) {
      const t = toughLove(n);
      expect(`${t.message} ${t.challenge}`).toMatch(CHALLENGE);
    }
    expect(comebackText(3)).toMatch(CHALLENGE);
  });

  it('R12.4: no message insults or degrades the user', () => {
    const texts = [];
    for (let n = 2; n < 2 + TOUGH_LOVE_MESSAGES.length; n += 1) {
      const t = toughLove(n);
      texts.push(t.title, t.message, t.challenge);
    }
    texts.push(comebackText(2), comebackText(10));
    for (const text of texts) expect(text, text).not.toMatch(SHAMING);
  });
});

describe('R12.5 comeback bonus', () => {
  it('R12.5: the first lift after a broken streak earns +50 XP on top of R2.1', () => {
    const { profile, result } = train([2, 9, 30]);
    expect(COMEBACK_XP).toBe(50);
    expect(result.xpEarned).toBe(xpForEntry(1) + 50);
    expect(result.comeback).toEqual({ lostWeeks: 2, bonusXp: 50 });
    expect(summarize(profile.entries).totalXp).toBe(3 * xpForEntry(1) + 50);
  });

  it('R12.5: only the first lift back gets the bonus', () => {
    const { profile, result } = train([2, 9, 30, 30]);
    expect(result.comeback).toBeNull();
    expect(comebacks(profile.entries).size).toBe(1);
  });

  it('R12.5: no bonus after a gap that follows a 1-week run', () => {
    const { result } = train([2, 30]);
    expect(result.comeback).toBeNull();
    expect(result.xpEarned).toBe(xpForEntry(1));
  });

  it('R12.5: no bonus when the next week is not skipped', () => {
    const { result } = train([2, 9, 22]);
    expect(result.comeback).toBeNull();
  });

  it('R12.5: deleting the comeback entry moves the bonus to the next lift back', () => {
    const { profile } = train([2, 9, 30, 31]);
    const [, , first, second] = profile.entries;
    expect([...comebacks(profile.entries).keys()]).toEqual([first.id]);
    const after = deleteEntry(profile, first.id);
    expect([...comebacks(after.entries).keys()]).toEqual([second.id]);
  });

  it('R12.5: deleting the streak removes the bonus', () => {
    const { profile } = train([2, 9, 30]);
    const after = deleteEntry(profile, profile.entries[0].id);
    expect(comebacks(after.entries).size).toBe(0);
    expect(summarize(after.entries).totalXp).toBe(2 * xpForEntry(1));
  });
});

describe('R12.6 comeback feedback', () => {
  it('R12.6: a comeback gives XP, then comeback, then level-up events', () => {
    const { result } = train([2, 9, 30]);
    const events = feedbackFor(result);
    expect(events.map((e) => e.type)).toEqual(['xp', 'comeback', 'level']);
    expect(events[0].text).toBe(`+${xpForEntry(1) + 50} XP`);
    expect(events[1]).toMatchObject({ lostWeeks: 2, bonusXp: 50 });
    expect(events[1].text).toBe(comebackText(2));
    expect(events[1].text).toMatch(/\+50 bonus XP/);
    expect(events[1].text).toMatch(/2 weeks/);
  });

  it('R12.6: a normal lift has no comeback event', () => {
    const { result } = train([2, 9]);
    expect(feedbackFor(result).some((e) => e.type === 'comeback')).toBe(false);
  });
});

describe('R8.4 / R12.1 streaks in profile stats', () => {
  it('R8.4: stats include the current and best streak', () => {
    const { profile } = train([2, 9, 16, 30]);
    const stats = profileStats(profile, at(30, 12));
    expect(stats.streak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });
});
