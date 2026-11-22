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
  - `profiles.js` creating, editing, switching, deleting profiles; stats
- `src/storage.js` — `localStorage` load/save; takes a storage object so tests
  can pass a fake.
- `src/main.js`, `src/style.css`, `index.html` — UI only; keep rules out of here.
- `tests/` — Vitest files. `tests/ui.test.js` checks R5/R7 by reading
  `index.html` and `src/style.css` as text.

## Data model

A profile stores only its details and its `entries`. Totals (XP, PB levels,
records) are always recomputed from entries, so deleting an entry stays
consistent. Never store derived totals.

Saved data lives under the `localStorage` key `grimlift:v2`. If the saved shape
changes, use a new key (`grimlift:v3`) and ask the user whether to migrate the
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
  implementation, then UI, then README. Push to `origin/master` when done.
  Commit straight to `master`; the user agreed to this.
- Don't commit handoff files (`handoff-*.md`) or CLAUDE.md changes the user
  asked to review first.
- `.gitignore` must keep excluding `node_modules/` and `*.jsonl`.
- Before saying the UI works, run it and look at it (see the handoff notes for
  the headless-Edge check). Stop any dev server you started.

## Constraints from the UI tests (`tests/ui.test.js`)

- The blackletter font (`var(--font-display)`) may only be used in CSS rules
  whose selectors end in `h1`, `h2`, or `h3` (R5.1).
- Every `font-size` must be `px`, `rem`, or `clamp(min, …)` and at least 16px /
  1rem. `em`, `%`, and keywords make the test fail on purpose (R5.2).
- `#log-page` in `index.html` must have exactly one `<form>`, exactly one
  `<button>` (the submit), and fields named exercise, sets, reps, weight, unit
  in that order (R7.1). Buttons added by JS at runtime aren't checked, so don't
  add buttons inside `#log-page` from `main.js` either. Delete buttons belong on
  the profile page.
