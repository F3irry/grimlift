# Handoff: end of round 5

For the session that does round 6. Read `CLAUDE.md` first (standing rules,
including how to check the UI in a browser and the new rules about `now` in
tests and XP changes), then `problem.md`, `spec.md`, and `docs/decisions/`
(0001–0006). This file covers only what's specific to where round 5 left off.

## Current state

- Branch `master`, pushed to `origin/master` (https://github.com/F3irry/grimlift).
  Last commit: `21f2419 Update README for round 5: Train page, limitations,
  weekly challenges`. The working tree is clean except for this file and
  uncommitted CLAUDE.md edits that the user is reviewing.
- `npm test`: 11 files, 194 tests, all passing.
- `npx vite build` succeeds (delete `dist/` afterwards).
- `spec.md` is the round-5 spec: R1–R13. Round 5 added R13 (suggestions,
  limitations, weekly challenges) and R4.6 (v3 → v4 migration), and changed
  R2.1, R4.1, R4.5, R6.1, R6.2, R8.2. "Body-part guidance" is no longer out of
  scope.
- Saved data is now **`grimlift:v4`** (`version: 4`). Each profile gained
  `limitations: []`. Load order: v4 → v3 (migrated) → v2 (migrated twice) →
  fresh. Broken v4 data starts fresh; it does not fall back to v3.

Round 5 commits:

| Step | Commit |
|---|---|
| requirements (user) | `7ae7848` |
| spec + CLAUDE.md | `d42bd41` |
| tests (failing at that commit) | `e694e1b` |
| logic + storage | `688ebec` |
| fix: suggestions keep the typed name (spec + test + logic) | `d9e401d` |
| UI | `d742bb9` |
| decision records 0004–0006 | `7ab72af` |
| README | `21f2419` |

`e694e1b` is a deliberately failing commit (the tests landed before the
modules they import). Every later commit passes.

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
- `tests/storage.test.js` (16): localStorage, v2 and v3 migration (R4)
- `tests/streaks.test.js` (25): streaks, tough love, comeback (R12)
- `tests/limitations.test.js` (8, new): R13.1
- `tests/exercises.test.js` (22, new): catalog, allowed, suggestions,
  prescriptions, blocked goals, tone (R13.2–R13.6, R13.14)
- `tests/challenges.test.js` (35, new): train/rest, lift steps, body-weight
  challenge, order and cap, challenge XP, pace warning, feedback, tone
  (R13.7–R13.12, R13.14)
- `tests/ui.test.js` (11): static markup checks (R5, R7, R12, R13.1, R13.13)

`tests/helpers.js`: `at(day, hour)` (local dates in Nov 2026; `at(23)` is
Monday 23 Nov; days past 30 roll into December), `newProfile()`, `lift()`, and
`SHAMING` (moved there from `streaks.test.js` this round). Mondays: `at(2)`,
`at(9)`, `at(16)`, `at(23)`, `at(30)`, `at(37)` (7 Dec).

## What round 5 built

- `src/logic/limitations.js` (new): `AREAS` (knees, hips, lowerBack,
  shoulders, elbows, wrists), `EQUIPMENT` (bodyweight < dumbbells < gym),
  `EXPERIENCE`, `DEFAULT_LIMITATIONS` (none / gym / beginner),
  `setLimitations(profile, input, now)` (replaces the latest record if it's in
  the same week), `currentLimitations`, `limitationsForWeek(profile, weekKey)`,
  `hasEquipment`.
- `src/logic/exercises.js` (new): `CATALOG` (41 exercises: name, bodyPart,
  equipment, loads, aka, hold), `findExercise(name)` (name or alias, R1.3
  matching), `blockReason`/`isAllowed`, `prescription`, `suggestions(profile)`,
  `blockedGoals(profile)`.
- `src/logic/challenges.js` (new): `weekChallenges(profile, weekKey, now)`,
  `currentChallenges`, `challengeXp(profile, now)`, `paceWarnings(profile)`,
  constants `CHALLENGE_XP = 30`, `MAX_CHALLENGES = 3`, `MAX_TRAINING_DAYS = 6`,
  `START_DAYS = 2`, `LIFT_STEP`, `PACE`. Each challenge is `{ id, kind, title,
  detail, done }`, with ids `train`, `rest`, `bw:<goalId>`, `lift:<goalId>`.
- `progression.js`: `profileLevel(profile, now)` adds `challengeXp`.
  `progressChange(before, after, now)` returns `challengesDone`, `xpEarned`
  (30 per new challenge), and `totalXp`. `logEntry` adds that to its own XP.
  `feedbackFor` emits `challenge` events after `comeback`.
- `goals.js` now exports `bestKgWithReps`; `dates.js` gained `shiftWeek`.
  (`streaks.js` still has its own private `shiftWeek`; they're the same.)
- `profiles.js`: `createApp()` is version 4; new profiles get `limitations: []`;
  `profileStats(profile, now)` passes `now` to `profileLevel`.
- `storage.js`: `STORAGE_KEY = 'grimlift:v4'`, `V3_KEY`, `migrateV3`.
- UI: a **Train** tab (`#/train`, `#train-page`); a **Limitations** panel on the
  profile page (`#limits-form`); `#/log/<exercise>` pre-fills the log form,
  then rewrites the URL to `#/log` and focuses Sets; a `.toast.challenge`
  alert. `commitProfile`/`playFeedback` take an `anchor` so XP from a weigh-in
  or habit tick pops at that control.

## Decisions made in round 5, and why

From the user (asked before the spec):

1. **Limitations = body areas to protect, equipment, and experience.** No
   free-text health note.
2. **Migrate v3 data** to the new `grimlift:v4` key.
3. **Challenges are automatic, weekly, and earn XP**: no Accept button, no
   stored challenge state.
4. **A new Train page** instead of the profile or log page.
5. **Suggestions grouped by body part**, so body-part guidance moved into
   scope.
6. **Healthy push = all four rules**: small lift steps, rest days (≤ 6 training
   days, rest after a 7-day week), a safe body-weight pace with a warning, and
   limitations always win.
7. **+30 XP per challenge** (less than the +50 comeback).
8. **No goals → starter plan**: one move per body part and "train 2 days".

Mine (listed for the user at the end of round 5; none vetoed, none explicitly
approved):

9. **Limitations stored as a dated history**, collapsed to one record per week
   (`docs/decisions/0004`), so past challenge XP doesn't change when
   limitations are edited.
10. **Challenges fixed at week start**, order train → body weight → lifts
    (oldest first), capped at 3. Habits get no challenge; only the oldest
    body-weight goal gets one (`0005`).
11. **Formulas**: training `N = min(G, max(2, last + 1), 6)`. Lift step 2.5%
    for beginners, 5% for intermediate and advanced, rounded *down* to 0.5 kg /
    1 lb, capped at the goal, with a +1 rep fallback. With no qualifying lift,
    the challenge is "target reps at a weight you control".
12. **The body-weight challenge rewards weighing in, not the number**
    (`0006`). Pace: 1%/week losing, 0.5%/week gaining. The warning compares the
    latest weigh-in with one at least 7 days older.
13. **Experience only sets sets (2/3/4) and the step size**; it never hides
    exercises.
14. **Reps**: 8–12 by default, 12–15 with an active lose-weight goal, the goal's
    reps for a goal exercise, 20–40 s for holds.
15. **Catalog contents and which areas each exercise loads.** My judgment;
    the page says suggestions are general and to ask a professional.
16. **Exercises not in the catalog count as allowed.**
17. **Suggestions show the name the user typed** for goal or logged exercises
    (bug found in the browser check, fixed in `d9e401d`).
18. **Deleting a goal removes its past challenge XP** (like R11.8's goal
    levels).
19. **Old tests now pass an explicit `now`**, and expected XP and events changed
    for R2.1/R6.1. This is now a standing rule in CLAUDE.md.
20. **UI**: tab order Log · Train · Profile, the "Fitted to …" summary with a
    Change link, the safety line, and all message wording.

## Unresolved / not done

- **The user hasn't reacted to the numbers or wording.** That covers the step
  sizes, the pace limits, the 2-day start, the cap of 3, and every new message.
  Ask.
- **Catalog accuracy is unreviewed.** Which areas an exercise "loads" is a
  judgment call (e.g. Plank loads shoulders and elbows, so a shoulder-protecting
  user gets no plank). Nobody with training knowledge has checked it.
- **Shoulders with bodyweight only** has a single option (Pike Push-up), so
  protecting shoulders, elbows, or wrists at home leaves nothing for shoulders.
  That's by design ("nothing fits, rest it"), but the list is thin.
- **Habit goals and training goals don't produce their own challenges.** The
  training goal only feeds `G` in the train challenge.
- **Challenge XP can be farmed a little**: a weigh-in a week is +30, and a
  rest-day challenge after a 7-day week pays out without lifting. Bounded
  (≤ 90 XP/week), but nobody has decided it's fine.
- **No challenge stats on the profile page** (e.g. challenges done). Not asked
  for.
- **Lift challenges on a renamed exercise**: a goal "Bench" and lifts logged as
  "Bench Press" are different exercises (R1.3/R11.2 match by exact normalized
  name, not by catalog alias). Suggestions now use typed names to avoid
  creating this, but older data can already have it.
- **Experience "advanced" behaves like "intermediate"** except for 4 sets
  instead of 3.
- **No automated UI behaviour tests.** The Train page, prefill link, limitations
  save, and challenge toast were checked once in headless Edge; those
  screenshots were in the round-5 scratchpad and are gone.
- Carried over: meals (in `problem.md`, out of scope); XP farming via tiny
  entries; levels can go down on delete; no undo or export; old `grimlift:v1`
  data left in storage; missing favicon (harmless 404); fonts from Google
  Fonts; comeback-bonus farming and the long-lapse banner from round 4.

## Warnings for the next session

- **Challenge XP is computed over every week** from the first entry or weigh-in
  to now, and each week scans entries. `profileLevel` runs several times per
  render (status bar, plus before and after in `progressChange`). That's fine
  for months of data, but with years of daily logs it could get slow. Measure
  before adding more per-week work.
- **`now` defaults to the real clock.** Any test that touches XP or level
  without passing `now` will start failing (or passing) depending on the date.
  The test dates are Nov–Dec 2026, very close to the real date this round
  (22 Nov 2026).
- **Changing `CATALOG` entries** (`loads`, `equipment`, names, aliases) changes
  which lift challenges existed in past weeks, and so past XP and levels.
  Reordering the catalog changes suggestions and blocked-goal alternatives;
  `tests/exercises.test.js` pins a few of those (e.g. Romanian Deadlift as the
  knee-safe legs alternative, Push-up for bodyweight chest).
- **Aliases must stay unique across the catalog** (a test checks this).
  `findExercise('curl')` → Dumbbell Curl and `'squat'` → Back Squat are
  deliberate.
- **`limitationsForWeek` uses the record saved before the week *ended***, so a
  limitations change on Sunday applies to that whole week, retroactively to its
  Monday.
- **The rest challenge uses `now`** to decide which days have ended. It's the
  only challenge whose `done` can flip from false to true without any new data.
  `progressChange` won't announce that (nothing changed), so there's no toast
  for it.
- **Don't commit this file or the CLAUDE.md edits.** The user reviews them
  first.
- Environment: Windows. The Bash tool is Git Bash; PowerShell is also there.
  Python heredocs in Bash broke twice this round (quoting and CRLF files).
  Use the Edit tool or write the script to the scratchpad and run it from
  there. Git prints `LF will be replaced by CRLF` on every add; that's harmless.
  Background dev servers report exit code 127 when stopped; that's expected.
