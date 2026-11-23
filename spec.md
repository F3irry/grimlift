# Grimlift — Specification (Round 5)

Grimlift is a gym tracker with game-style progression. It runs locally in the
browser, stores everything in `localStorage`, and needs no login or API keys.
This spec turns the requirements in `problem.md` and later rounds into testable
rules. Each rule has an ID; tests name the IDs they check.

Out of scope: meal tracking, passwords, sync between devices, medical advice.
*(Round 5: body-part guidance is no longer out of scope; R13 adds it.)*

## Round 5 changes at a glance

- Each profile records its limitations: body areas to protect, equipment
  available, and experience level (R13.1).
- A new **Train** page suggests exercises for each body part from a built-in
  catalog, filtered by limitations and ordered by goals (R13.2–R13.6).
- Each week the app sets up to three challenges from the profile's goals:
  train a number of days (or rest), weigh in at a healthy pace, and a small step
  on a lift goal. Each completed challenge earns +30 XP (R13.7–R13.11).
- Healthy limits: lift steps of at most 2.5–5%, never more than 6 training
  days, a rest-day challenge after a 7-day week, a body-weight pace limit with a
  warning, and limitations always win over goals (R13.3, R13.6, R13.8–R13.11).
- Saved data moves to `grimlift:v4`; round-3/4 data (`grimlift:v3`) is migrated
  (R4.6).

## Round 4 changes at a glance

- Weekly training streaks: weeks in a row with at least one logged lift
  (R12.1). The log page shows the current streak; the profile shows current and
  best.
- When a streak of 2+ weeks breaks, the log page shows a tough-love banner that
  challenges the user to come back, without insults (R12.2–R12.4).
- The first lift after a broken streak earns a +50 XP comeback bonus and a
  comeback message (R12.5, R12.6).
- No saved-data change: streaks and the bonus are derived from entries, so the
  storage key stays `grimlift:v3`.

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
- **Training week**: a week with at least one logged entry.
- **Streak**: a run of training weeks in a row, counted in weeks.
- **Limitations**: the body areas a profile protects, the equipment it has, and
  its experience level (R13.1).
- **Challenge**: a small weekly task the app sets from the profile's goals
  (R13.7).

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

- **R2.1** *(changed in round 5)* Each logged entry awards `20 + 5 × sets` XP
  at once (plus the comeback bonus of R12.5 when it applies). Each completed
  weekly challenge awards +30 XP (R13.7). Total XP is the sum of both.
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

- **R4.1** *(changed in round 5)* Profiles and everything in them (entries,
  weigh-ins, goals, habit check-ins, limitations), and which profile is active,
  are saved to `localStorage` under the key `grimlift:v4` after every change.
- **R4.2** On load, saved data is restored exactly.
- **R4.3** If saved data is missing, unreadable, or the wrong shape, the app
  starts fresh (no profiles) instead of crashing.
- **R4.4** Round-1 data (key `grimlift:v1`) is not loaded.
- **R4.5** *(new)* Round-2 data (key `grimlift:v2`) is migrated when there is no
  round-3 data (key `grimlift:v3`). Profiles, entries, and the active profile
  are kept. A saved body weight becomes one weigh-in at migration time. The old
  goal text becomes the goals note (R11.9). The goal list starts empty. The v2
  key is left untouched. *(Round 5: migrated v2 data then goes through R4.6
  too, and is used only when there is neither v4 nor v3 data.)*
- **R4.6** *(new)* Round-3/4 data (key `grimlift:v3`) is migrated when there is
  no `grimlift:v4` data. Everything is kept; each profile gets an empty
  limitations history (so it uses the defaults of R13.1). The v3 key is left
  untouched. If v4 data exists but is unreadable or the wrong shape, the app
  starts fresh (R4.3) and does not fall back to v3.

## R5 — Readable type that stays gothic

- **R5.1** The blackletter display font is used only on headings (`h1`–`h3`).
- **R5.2** Body text uses a readable serif, and no text is smaller than 16px.

## R6 — Every log feels like a rush

- **R6.1** *(changed in round 5)* Every change that earns something produces
  feedback events in this order: an XP event (`+N XP`, including any comeback
  and challenge bonus) when XP was earned; a comeback event when the entry is a
  comeback (R12.6); a challenge event for each weekly challenge newly completed
  (R13.12); a PB event when the entry is a personal best; a goal event for each
  goal newly reached; a level-up event with the new level when the level went
  up. Logging an entry always gives an XP event. Weigh-ins and habit check-ins
  can produce XP (from a challenge), challenge, goal, and level-up events.
- **R6.2** The UI shows them the instant the button is pressed: a floating XP
  number, a comeback, challenge, PB, or goal alert, and a full level-up moment. Motion is reduced when
  the system asks for reduced motion.

## R7 — Adding a workout stays simple

- **R7.1** The log page has exactly one form with five inputs (exercise, sets,
  reps, weight, unit) and one button.
- **R7.2** After logging, the exercise, weight, and unit stay filled in so a
  repeat log is one click.

## R8 — Personal profiles

- **R8.1** With no profiles, the app asks the user to create one before logging.
- **R8.2** *(changed in round 5)* A profile has a name (required, 1–40
  characters, unique ignoring case), a preferred unit (`kg`/`lb`, default `kg`),
  a list of weigh-ins (R10), a list of goals (R11), a goals note (R11.9), and a
  limitations history (R13.1).
  Creating a profile may include a first body weight, which becomes its first
  weigh-in.
- **R8.3** Several profiles can exist; a switcher picks the active one. Entries,
  weigh-ins, goals, XP, level, and records belong to one profile and never mix.
- **R8.4** *(changed in round 4)* The profile page shows a stats summary: level,
  total XP, entries logged, total sets, current body weight, goals reached,
  current and best streak (R12.1), and records.
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

## R12 — Tough love when a streak breaks *(new)*

- **R12.1** The *current streak* is the number of training weeks in a row that
  ends this week, or ends last week if this week has no entry yet (this week
  isn't over, so the streak is still alive). Otherwise it is 0. The *best
  streak* is the longest run of training weeks ever. Both are derived from
  entries, so deleting an entry recalculates them.
- **R12.2** A streak is *broken* when the most recent training week is two or
  more weeks before this week (so at least one whole week with no entry has
  ended) and the run ending in that week was at least 2 weeks long. That run's
  length is the *lost streak*. A run of 1 week followed by a gap is not a broken
  streak. The broken state lasts until the next entry is logged.
- **R12.3** While a streak is broken, the log page shows a tough-love banner
  above the form: a heading, a message that names the lost streak, and a
  challenge: the first lift back earns +50 XP, then beat the lost streak. The
  message is chosen from a fixed list by the lost streak's length, so the same
  break always shows the same message. The banner adds no buttons (R7.1).
- **R12.4** Tough love, not insults: every banner and comeback message
  challenges the user to act (log a lift, come back, beat the old streak) and
  never insults or degrades them. No message calls the user names or uses
  shaming words such as lazy, weak, pathetic, loser, quitter, failure, soft,
  excuse-maker, or disappointing.
- **R12.5** A *comeback entry* is an entry logged two or more weeks after the
  previous entry's week, when the run ending in the previous entry's week was at
  least 2 weeks long. It earns a flat +50 XP bonus on top of R2.1. The bonus is
  derived by replaying entries, so deleting entries recalculates it (if the
  comeback entry is deleted, the next entry in its place becomes the comeback).
- **R12.6** A comeback entry produces a comeback event (R6.1) with the lost
  streak and the bonus, e.g. "Comeback: +50 bonus XP. You held 4 weeks before.
  Now beat it." The UI shows it as an alert.
- **R12.7** The status bar shows the current streak, e.g. "Streak: 3 weeks".

## R13 — Suggestions and challenges from goals and limitations *(new)*

- **R13.1** *Limitations.* The profile page has a limitations section where the
  user sets, at any time:
  - **body areas to protect**: any of knees, hips, lower back, shoulders,
    elbows, wrists (none by default);
  - **equipment available**: bodyweight only, dumbbells, or full gym (each
    includes the ones before it; default full gym);
  - **experience**: beginner, intermediate, or advanced (default beginner).

  Saving stores a dated record. If the latest record was saved this week, it is
  replaced; otherwise the new record is added. The *current* limitations are the
  latest record, or the defaults if there is none. The limitations *in force for
  a week* are the latest record saved before that week ended (defaults if none).
  An unknown area, equipment, or experience value is rejected with a message,
  and nothing is saved.
- **R13.2** *Exercise catalog.* The app has a built-in catalog. Each exercise
  has a name, one body part (legs, back, chest, shoulders, arms, core), the
  equipment it needs, the body areas it loads, optional other names, and
  whether it is a timed hold. Every body part has at least two exercises and at
  least one bodyweight exercise. A typed exercise name matches a catalog
  exercise when it equals the exercise's name or one of its other names,
  ignoring case and repeated spaces (R1.3).
- **R13.3** *Limitations always win.* A catalog exercise is *allowed* when the
  profile has its equipment and it loads none of the protected areas. An
  exercise that isn't allowed is never suggested and never gets a challenge,
  even when a goal names it. Exercises that aren't in the catalog are treated as
  allowed, since the app knows nothing about them.
- **R13.4** *Suggested exercises.* For each body part, in the order legs, back,
  chest, shoulders, arms, core, the Train page suggests up to two allowed
  exercises (one when the profile has no goals: a balanced starter plan). They
  are ordered: exercises of active lift goals first, then exercises the profile
  has logged, then catalog order. A lift goal is *active* while it isn't
  reached. A suggestion uses the name the user typed when the exercise comes
  from a lift goal (the goal's name) or from the log (the first typed name,
  R1.3), so logging it counts toward that goal and record; otherwise it uses
  the catalog name. If no exercise of a body part is allowed, the page says that
  nothing there fits the limitations, and to rest that area or ask a
  professional.
- **R13.5** *How much.* Each suggestion shows sets × reps. Sets: 2 for
  beginners, 3 for intermediate, 4 for advanced. Reps: the target reps for an
  active lift goal's exercise; "20–40 s" for a timed hold; otherwise "12–15"
  when the profile has an active body-weight goal to lose weight, and "8–12" in
  all other cases.
- **R13.6** *Blocked goals.* For each active lift goal whose exercise is in the
  catalog but not allowed, the Train page says which protected area or missing
  equipment blocks it and names the first allowed exercise of the same body
  part (catalog order) as a safer alternative, or says that none fits.
- **R13.7** *Weekly challenges.* Each week has up to three challenges, taken in
  this order: one training or rest challenge (R13.8), one body-weight challenge
  (R13.10) if there is a body-weight goal, then a lift challenge (R13.9) for
  each lift goal, oldest goal first. A week's challenges are set from the
  entries and weigh-ins saved *before* the week started, the goals created
  before the week ends, and the limitations in force for that week, so they
  don't move while the user logs during the week. Each completed challenge
  earns +30 XP, once. Challenge XP is derived for every week from the first week
  with an entry or weigh-in up to this week. Deleting an entry, weigh-in, or
  goal, or changing this week's limitations, recalculates it. Earlier weeks keep
  the limitations that were in force then.
- **R13.8** *Train or rest.* Let *last* be the number of days in the previous
  week with at least one entry.
  - If *last* is 7, the challenge is to take a rest day: it is completed once
    any day of this week has ended with no entry.
  - Otherwise the challenge is to train *N* days this week, where
    `N = min(G, max(2, last + 1), 6)` and *G* is the largest days per week of
    the training goals (R11.4), or 2 if there are none. It is completed when the
    week has at least *N* days with an entry. So the push is never more than one
    extra day over last week (after a slow week, starting at 2), never past
    the goal, and never more than 6 days.
- **R13.9** *Small lift steps.* A lift goal gets a challenge when it was created
  before the week ends, was not reached before the week started, and its
  exercise is allowed. Let *B* be the heaviest weight (kg) logged for the
  exercise with at least the target reps before the week started.
  - If *B* is 0: log the exercise for the target reps at a weight you control.
    Completed by such an entry.
  - Otherwise the step is 2.5% for beginners and 5% for intermediate and
    advanced. The challenge weight is `B × (1 + step)` in the goal's unit,
    rounded *down* to 0.5 kg or 1 lb, and never above the goal's target. If
    that isn't heavier than *B*, the challenge is one more rep at *B* instead.
    Completed by an entry with at least the challenge weight (within 0.01 kg)
    and reps.

  Only entries for that exercise logged this week, after the goal was created,
  count.
- **R13.10** *Healthy body-weight pace.* The oldest body-weight goal created
  before the week ends and not reached before the week started gets a
  challenge: weigh in this week. Its text gives the healthy pace: at most 1% of
  body weight a week when losing, 0.5% when gaining, measured from the latest
  weigh-in before the week started (or the goal's start weight). Any weigh-in
  this week, saved after the goal was created, completes it. The number on the
  scale doesn't decide it, so the app never rewards losing or gaining faster.
- **R13.11** *Pace warning.* For each active body-weight goal, the Train page
  compares the current weigh-in with the latest weigh-in at least 7 days older.
  If the average weekly change toward the goal is faster than the pace in
  R13.10, it shows a warning to slow down, eat enough, and rest. With no
  weigh-in 7 or more days older, there is no warning.
- **R13.12** A challenge newly completed this week produces a challenge event
  (R6.1), e.g. "Challenge done: Train 2 days this week · +30 XP". Its XP is
  part of the XP event. The UI shows it as an alert.
- **R13.13** *Train page.* A third page, "Train", shows this week's
  challenges (each with its +30 XP and whether it's done), any pace warning
  and blocked-goal notes, and the suggestions by body part with sets × reps.
  Each suggestion has a "Log it" link that opens the log page with the exercise
  filled in. With no goals, it invites the user to add one. It says that the
  suggestions are general, and to stop and ask a professional if something
  hurts.
- **R13.14** *Healthy push, not pressure.* Every challenge, warning, and note
  says what to do and passes the same check as R12.4 (no name-calling or
  shaming words).

## Non-functional

- Starts with one command: `npm start` (Vite, plain JavaScript, no framework).
- Tests run with `npm test` (Vitest). Rules live in pure modules under
  `src/logic/` so they can be tested without a browser.
- Dark gothic visual style.
