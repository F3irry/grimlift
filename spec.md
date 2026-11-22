# Grimlift — Specification (Round 3)

Grimlift is a gym tracker with game-style progression. It runs locally in the
browser, stores everything in `localStorage`, and needs no login or API keys.
This spec turns the requirements in `problem.md` and later rounds into testable
rules. Each rule has an ID; tests name the IDs they check.

Out of scope: meal tracking, body-part guidance, passwords, sync between devices.

## Round 3 changes at a glance

- Account info (name, preferred unit) and personal info (body weight) are edited
  separately on the profile page (R9, R10).
- Body weight is now a dated history of weigh-ins instead of one number (R10).
- The one-line goal is replaced by a fitness goals section with four goal types,
  each with a target and progress (R11). Reaching a goal gives +1 level once.
- Round-2 saved data is migrated, not discarded (R4.5).

## Terms

- **Entry**: one logged exercise: name, number of sets, reps per set, weight per
  rep, and unit. Logging an entry is "logging a workout".
- **Profile**: one person using Grimlift on this device. Every entry, weigh-in,
  and goal belongs to exactly one profile.
- **Personal best (PB)**: the best entry ever logged for an exercise in a profile.
- **Weigh-in**: one body-weight reading with the time it was saved.
- **Goal**: a target the user sets. A goal is *reached* once its target is met
  after the goal was created; it stays reached unless the data that reached it
  is deleted.
- **Week**: Monday to Sunday in the device's local time. **Day**: a local
  calendar date.

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
- **R1.4** A logged entry can be deleted. XP, level, records, and goals are then
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
- **R3.4** *(changed in round 3)* Level =
  `1 + xpLevels + pbLevels + goalLevels` (goal levels: R11.8).
- **R3.5** Records and all other weights are shown in the profile's preferred
  unit, rounded to 0.1.

## R4 — Data survives closing the app

- **R4.1** Profiles and everything in them (entries, weigh-ins, goals, habit
  check-ins), and which profile is active, are saved to `localStorage` after
  every change.
- **R4.2** On load, saved data is restored exactly.
- **R4.3** If saved data is missing, unreadable, or the wrong shape, the app
  starts fresh (no profiles) instead of crashing.
- **R4.4** Round-1 data (key `grimlift:v1`) is not loaded.
- **R4.5** *(new)* Round-2 data (key `grimlift:v2`) is migrated when there is no
  round-3 data (key `grimlift:v3`). Profiles, entries, and the active profile
  are kept. A saved body weight becomes one weigh-in at migration time. The old
  goal text becomes the goals note (R11.9). The goal list starts empty. The v2
  key is left untouched.

## R5 — Readable type that stays gothic

- **R5.1** The blackletter display font is used only on headings (`h1`–`h3`).
- **R5.2** Body text uses a readable serif, and no text is smaller than 16px.

## R6 — Every log feels like a rush

- **R6.1** *(changed in round 3)* Every change that earns something produces
  feedback events in this order: an XP event (`+N XP`) when XP was earned; a PB
  event when the entry is a personal best; a goal event for each goal newly
  reached; a level-up event with the new level when the level went up. Logging
  an entry always gives an XP event. Weigh-ins and habit check-ins can produce
  goal and level-up events.
- **R6.2** The UI shows them the instant the button is pressed: a floating XP
  number, a PB or goal alert, and a full level-up moment. Motion is reduced when
  the system asks for reduced motion.

## R7 — Adding a workout stays simple

- **R7.1** The log page has exactly one form with five inputs (exercise, sets,
  reps, weight, unit) and one button.
- **R7.2** After logging, the exercise, weight, and unit stay filled in so a
  repeat log is one click.

## R8 — Personal profiles

- **R8.1** With no profiles, the app asks the user to create one before logging.
- **R8.2** *(changed in round 3)* A profile has a name (required, 1–40
  characters, unique ignoring case), a preferred unit (`kg`/`lb`, default `kg`),
  a list of weigh-ins (R10), a list of goals (R11), and a goals note (R11.9).
  Creating a profile may include a first body weight, which becomes its first
  weigh-in.
- **R8.3** Several profiles can exist; a switcher picks the active one. Entries,
  weigh-ins, goals, XP, level, and records belong to one profile and never mix.
- **R8.4** *(changed in round 3)* The profile page shows a stats summary: level,
  total XP, entries logged, total sets, current body weight, goals reached, and
  records.
- **R8.5** A profile can be deleted after confirmation, with all its data. The
  app then switches to another profile, or asks to create one if none remain.

## R9 — Edit account info *(new)*

- **R9.1** The profile page has an account section where the name and preferred
  unit can be changed at any time, with the same rules as R8.2. Saving does not
  touch entries, weigh-ins, or goals.
- **R9.2** Changing the preferred unit does not change stored data; all weights
  (records, body weight, goal targets) are then shown in the new unit.

## R10 — Edit personal info *(new)*

- **R10.1** The profile page has a personal section where a new body weight can
  be saved at any time, entered in the preferred unit. It must be a number above
  0 and at most 700 kg (or the same in lb). It is stored in kg with the time it
  was saved.
- **R10.2** Current body weight is the most recent weigh-in. The personal
  section shows the current body weight and the weigh-in history, newest first.
  A weigh-in can be deleted.
- **R10.3** Weigh-ins are saved immediately (R4.1).

## R11 — Fitness goals *(new)*

- **R11.1** The goals section lets the user add goals of four types, grouped by
  what they're for:
  - *Muscle growth*: a **lift target** (R11.2)
  - *How I want to look*: a **body-weight target** (R11.3)
  - *Health habits*: a **weekly training target** (R11.4) or a **custom habit**
    (R11.5)

  A profile can have up to 12 goals at once.
- **R11.2** A lift target has an exercise, a target weight and unit, and target
  reps (whole number, 1–1000). Its *best* is the heaviest weight (in kg) logged
  for that exercise with at least the target reps. Its *baseline* is the best
  when the goal is created (0 if none). The goal is rejected if the baseline
  already meets the target. Progress = `(best − baseline) / (target − baseline)`.
  It is reached when an entry logged after the goal was created has weight ≥
  target and reps ≥ target reps.
- **R11.3** A body-weight target has a target weight, entered in the preferred
  unit. It needs a current body weight. *Start* is the current body weight when
  the goal is created, and the target must differ from it by at least 0.1 kg.
  Progress = `(start − current) / (start − target)`, which works for losing or
  gaining. It is reached when a weigh-in saved after the goal was created is at
  or past the target in the goal's direction.
- **R11.4** A weekly training target is a number of days per week (1–7).
  Only entries logged after the goal was created count. Progress = days this
  week with at least one such entry ÷ target. It is reached the first time a
  week has at least that many such days.
- **R11.5** A custom habit has a name (1–60 characters) and a number of days per
  week (1–7). The user ticks or unticks days of the current week, from the day
  the goal was created up to today; other days can't be ticked. Progress = days
  ticked this week ÷ target. It is reached the first time a week has at least
  that many ticks.
- **R11.6** Progress is clamped to 0–100% and shown as a bar with a percentage
  and what is left, e.g. "12.5 kg to go" or "2 more days this week". Reached
  goals are marked as reached. Weekly goals still show this week's progress.
- **R11.7** A goal can be deleted. Goals can't be edited; delete one and add a
  new one instead.
- **R11.8** Each reached goal gives +1 level, once. Deleting the goal, or the
  data that reached it, removes that level.
- **R11.9** A free-text goals note (up to 140 characters) can be edited in the
  goals section.

## Non-functional

- Starts with one command: `npm start` (Vite, plain JavaScript, no framework).
- Tests run with `npm test` (Vitest). Rules live in pure modules under
  `src/logic/` so they can be tested without a browser.
- Dark gothic visual style.
