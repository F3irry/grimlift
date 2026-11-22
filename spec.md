# Grimlift — Specification (Round 1)

Grimlift is a gym tracker with game-style progression. It runs locally in the
browser, stores everything in `localStorage`, and needs no login or API keys.
This spec expands the requirements in `problem.md` into testable rules. Each rule
has an ID; tests name the IDs they check.

Out of scope for round 1: meal tracking, body-part guidance, accounts, sync.

## Terms

- **Set**: one entry of exercise name, weight, and reps.
- **Workout**: a session holding one or more sets. It is a *draft* until the user
  completes it; only completed workouts count for XP, level, and personal bests.
- **Personal best (PB)**: the best set ever recorded for an exercise.

## R1 — Logging a workout is easy

- **R1.1** A set needs an exercise name, a weight, and a rep count. The exercise
  name is trimmed and must not be empty.
- **R1.2** Weight is a number ≥ 0 (0 allows bodyweight moves). Reps is a whole
  number ≥ 1. Invalid input is rejected with a message saying what is wrong, and
  nothing is added.
- **R1.3** Exercise names are matched ignoring case and repeated spaces, so
  "Bench  Press" and "bench press" are the same exercise. The name as first
  typed is kept for display.
- **R1.4** Sets can be added to and removed from the draft workout before it is
  completed.
- **R1.5** A workout with no sets cannot be completed.
- **R1.6** The UI lets the user add a set with one form (exercise, weight, reps)
  and offers previously used exercise names as suggestions.

## R2 — Completing a workout earns XP

- **R2.1** Completing a workout awards `20 + 5 × (number of sets)` XP.
- **R2.2** Every 100 XP is one level from XP: `xpLevels = floor(totalXP / 100)`.
- **R2.3** The UI shows total XP, the current level, and progress toward the next
  XP level, and reports the XP earned when a workout is completed.

## R3 — A new personal best levels you up

- **R3.1** A set beats the previous best for its exercise when its weight is
  higher, or its weight is equal and its reps are higher.
- **R3.2** The first set ever recorded for an exercise sets the baseline and is
  not a PB.
- **R3.3** Sets are checked in order, so the best includes earlier sets in the
  same workout.
- **R3.4** Each exercise with at least one PB in a completed workout gives
  exactly one bonus level (several PB sets on one exercise in one workout still
  give one level; PBs on two exercises give two).
- **R3.5** Level = `1 + xpLevels + pbLevels`, where `pbLevels` is the total bonus
  levels earned from PBs.
- **R3.6** The UI announces each new PB and level-up when a workout is completed.

## R4 — Data survives closing the app

- **R4.1** Completed workouts, total XP, PB levels, personal bests, and the
  draft workout are saved to `localStorage` after every change.
- **R4.2** On load, saved data is restored exactly.
- **R4.3** If there is no saved data, or it is unreadable or the wrong shape,
  the app starts with a fresh state (level 1, 0 XP) instead of crashing.

## Non-functional

- Starts with one command: `npm run dev` (Vite, plain JavaScript, no framework).
- Tests run with `npm test` (Vitest). Game rules live in pure modules under
  `src/logic/` so they can be tested without a browser.
- Dark gothic visual style.
