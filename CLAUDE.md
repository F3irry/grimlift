# CLAUDE.md

Guidance for Claude working in this repo.

## Project

Grimlift: a local-only gym tracker with XP and levels. Read `problem.md` for the
user's problem and `spec.md` for the numbered rules (R1.1, R2.1, …).

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm test` — run the Vitest suite once

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

## Rules

- Plain JavaScript (ES modules), no framework, no backend, no API keys, no login.
- Every test name starts with the spec ID it checks, e.g. `R3.2: first set ...`.
- When a rule changes, update `spec.md` and its tests in the same change.
- Never edit or amend the `problem.md` commit. Never undo or amend any commit;
  fix forward with a new commit.
- Small commits; messages say what changed and why.
- Keep the dark gothic style (see CSS variables in `src/style.css`).
