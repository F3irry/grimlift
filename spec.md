# Grimlift — Specification (Round 2)

Grimlift is a gym tracker with game-style progression. It runs locally in the
browser, stores everything in `localStorage`, and needs no login or API keys.
This spec turns the requirements in `problem.md` and the round-2 requirements
into testable rules. Each rule has an ID; tests name the IDs they check.

Out of scope: meal tracking, body-part guidance, passwords, sync between devices.

## Round 2 changes at a glance

- An entry is now exercise + sets + reps + weight + unit (kg/lb).
- There is no draft or "Complete workout" step: one button logs an entry and
  rewards it immediately (R6, R7). XP per entry uses the round-1 formula.
- Several local profiles, each with its own data (R8).
- Round-1 saved data is not carried over (R4.4).

## Terms

- **Entry**: one logged exercise: name, number of sets, reps per set, weight per
  rep, and unit. Logging an entry is "logging a workout".
- **Profile**: one person using Grimlift on this device. Every entry belongs to
  exactly one profile.
- **Personal best (PB)**: the best entry ever logged for an exercise in a profile.

## R1 — Logging a workout is easy

- **R1.1** An entry needs an exercise name, number of sets, reps, weight, and a
  unit. The exercise name is trimmed and must not be empty.
- **R1.2** Sets is a whole number from 1 to 50. Reps is a whole number from 1 to
  1000. Weight is a number ≥ 0 (0 allows bodyweight moves). Unit is `kg` or
  `lb`. Invalid input is rejected with a message naming the field, and nothing
  is saved.
- **R1.3** Exercise names are matched ignoring case and repeated spaces, so
  "Bench  Press" and "bench press" are the same exercise. The name as first
  typed is kept for display.
- **R1.4** A logged entry can be deleted. XP, level, and records are then
  recalculated as if it had never been logged.
- **R1.5** The form suggests exercise names the profile has used before.
- **R1.6** The unit picker starts on the profile's preferred unit.

## R2 — Logging earns XP

- **R2.1** Each logged entry awards `20 + 5 × sets` XP at once.
- **R2.2** Every 100 XP is one level from XP: `xpLevels = floor(totalXP / 100)`.
- **R2.3** The UI shows total XP, the current level, and progress toward the next
  XP level.

## R3 — A new personal best levels you up

- **R3.1** Weights are compared in kg (1 lb = 0.45359237 kg). An entry beats the
  best when it is heavier, or the same weight (within 0.01 kg) with more reps.
- **R3.2** The first entry for an exercise sets the baseline and is not a PB.
- **R3.3** Each PB entry gives exactly one bonus level.
- **R3.4** Level = `1 + xpLevels + pbLevels`.
- **R3.5** Records are shown in the profile's preferred unit, rounded to 0.1.

## R4 — Data survives closing the app

- **R4.1** Profiles, their entries, and which profile is active are saved to
  `localStorage` after every change.
- **R4.2** On load, saved data is restored exactly.
- **R4.3** If saved data is missing, unreadable, or the wrong shape, the app
  starts fresh (no profiles) instead of crashing.
- **R4.4** Round-1 data (key `grimlift:v1`) is not loaded.

## R5 — Readable type that stays gothic

- **R5.1** The blackletter display font is used only on headings (`h1`–`h3`).
- **R5.2** Body text uses a readable serif, and no text is smaller than 16px.

## R6 — Every log feels like a rush

- **R6.1** Logging an entry produces feedback events in this order: an XP event
  (`+N XP`) every time; a PB event when the entry is a personal best; a level-up
  event with the new level when the level went up.
- **R6.2** The UI shows them the instant the button is pressed: a floating XP
  number, a PB alert, and a full level-up moment. Motion is reduced when the
  system asks for reduced motion.

## R7 — Adding a workout stays simple

- **R7.1** The log page has exactly one form with five inputs (exercise, sets,
  reps, weight, unit) and one button.
- **R7.2** After logging, the exercise, weight, and unit stay filled in so a
  repeat log is one click.

## R8 — Personal profiles

- **R8.1** With no profiles, the app asks the user to create one before logging.
- **R8.2** A profile has a name (required, 1–40 characters, unique ignoring
  case), a preferred unit (`kg`/`lb`, default `kg`), an optional body weight
  (> 0, stored in kg, shown in the preferred unit), and an optional goal (up to
  140 characters).
- **R8.3** Several profiles can exist; a switcher picks the active one. Entries,
  XP, level, and records belong to one profile and never mix.
- **R8.4** The profile page edits these details and shows a stats summary:
  level, total XP, entries logged, total sets, and records.
- **R8.5** A profile can be deleted after confirmation, with all its data. The
  app then switches to another profile, or asks to create one if none remain.

## Non-functional

- Starts with one command: `npm start` (Vite, plain JavaScript, no framework).
- Tests run with `npm test` (Vitest). Rules live in pure modules under
  `src/logic/` so they can be tested without a browser.
- Dark gothic visual style.
