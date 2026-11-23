# Handoff: end of round 4

For the session that does round 5. Read `CLAUDE.md` first (standing rules,
including how to check the UI in a browser), then `problem.md`, `spec.md`, and
`docs/decisions/`. This file covers only what's specific to where round 4 left
off.

## Current state

- Branch `master`, pushed to `origin/master` (https://github.com/F3irry/grimlift).
  Last commit: `51a9b3d Update README for round 4: streaks and comeback bonus`.
  The working tree is clean except for this file and uncommitted CLAUDE.md edits
  that the user is reviewing.
- `npm test`: 8 files, 121 tests, all passing.
- `npx vite build` succeeds (delete `dist/` afterwards).
- `spec.md` is the round-4 spec: R1–R12. Round 4 added R12 (tough love when a
  streak breaks) and changed R2.1, R6.1, R6.2, and R8.4.
- Saved data is still `grimlift:v3`. Round 4 didn't change the stored shape.
- There is **no `handoff-round-3.md`**. Round 3's decisions survive only in
  `spec.md`, the commit messages (`4927a12` … `b6b04bc`), and `README.md`.
  `handoff-round-2.md` is committed (in `b638247`) and is out of date in places.
  For example, it says the spec ends at R8.

Round 4 commits:

| Step | Commit |
|---|---|
| requirements (user) | `b87d6c9` |
| spec + CLAUDE.md layout line | `5c702f1` |
| failing tests | `a2f89f8` |
| logic (`streaks.js`, progression, profiles) | `774fc94` |
| UI | `cfd456f` |
| message wording fix | `81fa122` |
| decision records 0001–0003 | `0a90f7a` |
| README | `51a9b3d` |

Every round-4 commit is runnable; there's no broken in-between state like
round 2's `2595653`.

## How to run and test

```sh
npm start      # installs, then opens http://localhost:5173
npm run dev    # same, without reinstalling
npm test       # Vitest, once
npx vite build # build check; then delete dist/
```

Test files (test count):

- `tests/entries.test.js` (11): validation, names, units (R1, R3.1, R3.5)
- `tests/progression.test.js` (22): XP, PBs, level, delete, feedback (R1–R3, R6.1)
- `tests/profiles.test.js` (15): profiles, account edits, stats (R8, R9)
- `tests/bodyweight.test.js` (7): weigh-ins (R10)
- `tests/goals.test.js` (22): goals (R11)
- `tests/storage.test.js` (11): localStorage and v2 migration (R4)
- `tests/streaks.test.js` (25): streaks, broken state, tough love, comeback
  bonus (R12, plus R8.4's streak fields)
- `tests/ui.test.js` (8): static checks of `index.html`/`style.css` (R5, R7,
  R12.3, R12.7, R8.4)

`tests/helpers.js` has `at(day, hour)` for local dates in Nov 2026 (`at(23)` is
Monday 23 Nov; days past 30 roll into December), `newProfile()`, and `lift()`.
Mondays: `at(2)`, `at(9)`, `at(16)`, `at(23)`, `at(30)`, `at(37)` (7 Dec).

## What round 4 built

- `src/logic/streaks.js` (new): `streakStatus(entries, now)` →
  `{ current, best, broken, lostWeeks }`; `comebacks(entries)` → Map of entry
  id → lost streak; `toughLove(lostWeeks)` → `{ title, message, challenge }`;
  `comebackText(lostWeeks)`; `TOUGH_LOVE_MESSAGES` (4); `COMEBACK_XP = 50`;
  `MIN_BROKEN_STREAK = 2`. It imports only `dates.js`, so it can't create an
  import cycle with `progression.js`.
- `progression.js`: `summarize()` adds +50 XP for comeback entries and returns
  `comebackIds`. `logEntry()`'s result has `comeback: { lostWeeks, bonusXp } |
  null`, and `xpEarned` includes the bonus. `feedbackFor()` emits a `comeback`
  event right after the `xp` event.
- `profiles.js`: `profileStats(profile, now = new Date())` now also returns
  `streak`, `bestStreak`, `streakBroken`, `lostWeeks`.
- UI: `#streak` line in the status bar, `#streak-banner` on the log page above
  the form (shown while broken), `#st-streak` / `#st-best-streak` on the profile
  page, and a red `.toast.comeback` for the comeback event.

## Decisions made in round 4, and why

From the user (I asked before writing the spec):

1. **A streak counts training weeks** (Mon–Sun weeks with ≥ 1 lift), not days,
   goal-weeks, or per-goal streaks. Rest days don't break it. See
   `docs/decisions/0001`.
2. **Only a streak of 2+ weeks can "break"**, so one lift followed by a gap
   doesn't get a lecture.
3. **The banner shows on the log page until the next lift**, with no dismiss
   button. The comeback lift then gets its own message.
4. **Comeback bonus: a flat +50 XP** on the first lift after a broken streak
   (the user picked "bonus" over "words only" or "lose XP").
5. **Show the current streak on the log page.**

Mine (listed for the user at the end of round 4; none were vetoed, but none
were explicitly approved either):

6. **"Broken" means at least one whole empty week has ended**: the latest
   training week is two or more weeks before this week. A break therefore shows
   8–13 days after the last lift. The current week never breaks a streak while
   it's still in progress.
7. **Everything is derived, nothing stored** (`docs/decisions/0002`). Storage
   stays at v3. As a result, deleting the comeback lift moves the bonus to the
   next lift after the break, and deleting part of the old streak can remove the
   bonus entirely.
8. **The XP pop shows the total** (base + bonus). The comeback event follows it.
   Feedback order is xp → comeback → pb → goal → level.
9. **Comeback alert is a toast**, not the PB alert box, so a comeback that's also
   a PB shows both.
10. **Fixed, hand-written messages** chosen by `lostWeeks % 4` (deterministic),
    checked by a test for a call to action and against a shaming-word list
    (`docs/decisions/0003`).
11. **Best streak added to profile stats** (R8.4 updated). The user asked only
    for the current streak on the log page.
12. **`profileStats` takes `now`** so streak values are testable.
13. I wrote **three** decision records; the user asked for at least one.

## Unresolved / not done

- **The user hasn't reacted to the message wording.** The four tough-love lines
  and the comeback line are mine. Ask whether the tone is tough enough, or too
  tough.
- **Comeback bonus can be farmed slowly:** train two weeks, skip one, come back
  for +50, repeat. Bounded (at most one bonus per three weeks), but nobody has
  decided it's fine.
- **Weekly goals (R11.4/R11.5) and streaks are separate concepts** that both
  count weeks. A user might expect a habit or training goal to have its own
  streak. Ask if a future round touches this.
- **A long-lapsed user sees the same banner however long they were gone.** The
  message doesn't mention how many weeks they were away (`streakStatus` doesn't
  return that).
- **No automated UI behaviour tests.** The banner show/hide, the toast, and the
  streak text were checked once in headless Edge (screenshots were in the
  round-4 scratchpad and are gone).
- Carried over from earlier rounds: meals and per-body-part guidance (in
  `problem.md`, out of scope in `spec.md`); XP farming via tiny entries; levels
  can go down on delete; no undo for deleting an entry; no export/backup; old
  `grimlift:v1` data left in localStorage; missing favicon (harmless 404);
  fonts load from Google Fonts (falls back to Georgia offline).

## Warnings for the next session

- **Streaks depend on the device's local week.** Changing timezone or the
  device clock can shift which week a lift falls in. Tests use local
  `new Date(y, m, d, h)` dates. Keep it that way.
- **`comebacks()` assumes entries are in logged order** (they're appended in
  `logEntry`). It tracks the latest week seen, so out-of-order entries won't
  crash it, but a future "edit a lift's date" or import feature would need a
  sort first.
- **Changing `TOUGH_LOVE_MESSAGES` changes which message a given break shows**
  (index = `lostWeeks % length`). Tests don't pin specific texts, only
  properties, but the user might notice.
- **Changing `COMEBACK_XP` changes everyone's past XP and possibly levels**,
  because XP is replayed from entries. The same applies to any XP formula change.
- **The R12.4 test's word list is a floor, not a guarantee.** Read new messages
  yourself.
- **`progressChange()` returns `comeback: null`.** Weigh-ins and habit ticks never
  produce a comeback event. Only lifts count toward streaks.
- **Don't commit this file or the CLAUDE.md edits.** The user reviews them
  first.
- Environment: Windows. Bash tool is Git Bash; PowerShell is also available. Git
  prints `LF will be replaced by CRLF` on every add; harmless. Background dev
  servers report exit code 127 when you stop them; that's expected.
