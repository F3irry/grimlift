# CLAUDE.md

Guidance for Claude working in this repo.

## Project

Grimlift: a local-only gym tracker with XP and levels. Read `problem.md` for the
user's problem and `spec.md` for the numbered rules (R1.1, R2.1, …).

## Commands

- `npm start` — install dependencies and open the app (http://localhost:5173)
- `npm run dev` — start the Vite dev server without reinstalling
- `npm test` — run the Vitest suite once
- `npx vite build` — check that the app builds (delete `dist/` afterwards)

## Layout

- `src/logic/` — pure rules (no DOM). All logic tests target these.
  - `units.js` kg/lb conversion and formatting
  - `entries.js` entry validation and exercise names
  - `progression.js` XP, PBs, level, feedback events (derived by replaying entries)
  - `bodyweight.js` weigh-ins (R10)
  - `goals.js` goal validation, progress, and reached status (R11)
  - `dates.js` local day/week keys (weeks start Monday)
  - `streaks.js` weekly streaks, broken-streak state, comeback bonus,
    tough-love messages (R12)
  - `profiles.js` creating, editing, switching, deleting profiles; level; stats
  - `limitations.js` protected areas, equipment, experience, diet; dated history (R13.1)
  - `exercises.js` built-in exercise catalog, "allowed", suggestions (R13.2–R13.6)
  - `challenges.js` weekly challenges, challenge XP, pace warning (R13.7–R13.11)
  - `meals.js` built-in meal list, diet rules, focuses, meal suggestions (R14)
- `src/storage.js` — `localStorage` load/save; takes a storage object so tests
  can pass a fake.
- `src/main.js`, `src/style.css`, `index.html` — UI only; keep rules out of here.
- `tests/` — Vitest files. `tests/ui.test.js` checks R5, R7, R12, R13, and R14
  markup by reading `index.html` and `src/style.css` as text. `tests/helpers.js`
  has `at(day, hour)`, `newProfile()`, `lift()`, and `SHAMING` (the word list
  every user-facing message is checked against).

## Data model

A profile stores only its details and raw records: `entries`, `weighIns`,
`goals` (with habit `checks`), `goalNote`, and `limitations` (a dated history,
so past weeks' challenges keep the limitations in force then; each record also
holds the `diet` list). Nothing about meals is stored (R14.6). Totals (XP, PB
levels, goal levels, records, goal progress, streaks, the comeback bonus,
weekly challenges and their XP) are always
recomputed from those, so deleting
anything stays consistent. Never store derived totals. The only stored values
captured at a point in time are a goal's `baselineKg` (lift) and `startKg`
(body weight), because they mean "where you were when you set the goal".

Logic that depends on the date takes `now` as a parameter. Tests build dates
with the local `new Date(y, m, d, h)` constructor so they pass in any timezone.
Tests must pass `now` explicitly to anything that touches XP or level
(`profileStats`, `profileLevel`, `progressChange`, `challengeXp`, …): challenge
XP depends on the date, so the real-clock default makes a test change its result
once the real date passes the test dates.

XP is replayed from records, so changing any XP rule (the per-entry formula,
`COMEBACK_XP`, `CHALLENGE_XP`, challenge formulas, or the catalog's `loads` and
`equipment`) rewrites every user's past XP and levels. Say so to the user when
proposing such a change.

Saved data lives under the `localStorage` key `grimlift:v5` (v4, v3, and v2
are migrated on load; v1 is ignored). If the saved shape
changes, use a new key (`grimlift:v6`) and ask the user whether to migrate the
old data or start fresh. Don't decide that yourself.

## Rules

- Plain JavaScript (ES modules), no framework, no backend, no API keys, no login.
- Every test name starts with the spec ID it checks, e.g. `R3.2: first set ...`.
- When a rule changes, update `spec.md` and its tests in the same change.
- Never edit or amend the `problem.md` commit. Never undo or amend any commit;
  fix forward with a new commit.
- Small commits; messages say what changed and why.
- Keep the dark gothic style (see CSS variables in `src/style.css`).

## Workflow

- Each round, ask the user about anything unclear before writing the spec.
  Requirements often conflict with earlier rounds (e.g. round 2's one-button rule
  removed round 1's Complete step); point that out instead of guessing.
- Order of commits per round: spec + CLAUDE.md, then tests (failing), then
  implementation, then UI, then decision records, then README. Push to
  `origin/master` when done.
  Commit straight to `master`; the user agreed to this.
- Don't commit handoff files (`handoff-*.md`) or CLAUDE.md changes the user
  asked to review first.
- `.gitignore` must keep excluding `node_modules/` and `*.jsonl`.
- Each round, write at least one decision record in `docs/decisions/` for a
  decision that had real alternatives: a Y-statement ("In the context of …,
  facing …, we decided for … and neglected …, to achieve …, accepting …"),
  saying who decided (the user or Claude). Files are numbered `0001-…md`,
  `0002-…md`, …; never renumber or edit an accepted record. Supersede it with
  a new one instead.
- At the end of a round, list every decision you made that the user didn't ask
  for.
- Before saying the UI works, run it and look at it (see below). Stop any dev
  server you started.

## Checking the UI in a browser

- In a scratchpad folder outside the repo: `npm init -y`, `npm i puppeteer-core`.
  Don't add puppeteer to the project's dependencies unless the user agrees.
- Start `npx vite --port 5179 --strictPort` in the repo (in the background).
- Launch with `executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'`,
  `headless: true`. Collect `pageerror` events and take screenshots.
- To seed data: open the app, `localStorage.setItem('grimlift:v5', …)`, then
  call `page.reload()`. Navigating to `#/log` from `/` only changes the hash, so
  the app keeps its in-memory empty state and the seed is ignored.
- Stop the server with PowerShell:
  `Get-NetTCPConnection -LocalPort 5179 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Constraints from the UI tests (`tests/ui.test.js`)

- The blackletter font (`var(--font-display)`) may only be used in CSS rules
  whose selectors end in `h1`, `h2`, or `h3` (R5.1).
- Every `font-size` must be `px`, `rem`, or `clamp(min, …)` and at least 16px /
  1rem. `em`, `%`, and keywords make the test fail on purpose (R5.2).
- `#streak-banner` must stay inside `#log-page`, before the form, with no
  buttons (R12.3).
- Any new user-facing message (tough love, comeback, challenge, pace warning,
  blocked-goal note, "nothing fits") must pass the `SHAMING` check from
  `tests/helpers.js` (R12.4, R13.14) and be added to a test that checks it.
  Passing it isn't enough: read the message yourself, since the word list only
  catches obvious insults.
- The `#limits-form` checkbox and option values must match `AREAS`,
  `EQUIPMENT`, `EXPERIENCE`, and `DIETS` in `src/logic/limitations.js`, in
  the same order (R13.1). The nav needs `a[data-route="train"]` and `#train-page` needs
  `#challenge-list`, `#train-warnings`, `#suggestion-list`,
  `#train-goal-prompt`, and `#train-safety` (R13.13). The nav needs
  `a[data-route="fuel"]` and `#fuel-page` needs `#meal-list`, `#fuel-diet`,
  `#fuel-goal-prompt`, and `#fuel-safety` saying "not medical advice" (R14.5).
- `#log-page` in `index.html` must have exactly one `<form>`, exactly one
  `<button>` (the submit), and fields named exercise, sets, reps, weight, unit
  in that order (R7.1). Buttons added by JS at runtime aren't checked, so don't
  add buttons inside `#log-page` from `main.js` either. Delete buttons belong on
  the profile page.
