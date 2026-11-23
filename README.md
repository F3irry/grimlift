# Grimlift

A dark gothic gym tracker that turns lifting into leveling up. Log a lift with
one form and one button, and the app answers right away with XP, personal-best
alerts, and level-ups. Everything runs in your browser and is saved in
`localStorage`, so there is no account, no server, and no API key.

## What it does

- **Log a lift in one go**: exercise, sets, reps, weight, and kg or lb. Exercises
  you've used before are suggested. The exercise, weight, and unit stay filled
  in, so logging the same lift again takes one click.
- **Instant rewards**: every lift earns 20 XP + 5 XP per set, shown as a
  floating XP pop. Every 100 XP is a level.
- **Records level you up**: beating your best on an exercise (heavier, or the
  same weight for more reps, compared fairly across kg and lb) shows a
  personal-best alert and gives an instant +1 level. The first time you log an
  exercise sets its baseline.
- **Profiles**: several people can use Grimlift on one device. Each profile has
  its own lifts, XP, level, records, body weight, and goals. You can change your
  name and preferred unit at any time (all weights switch units for display),
  and the profile page shows your stats and full lift history (lifts can be
  deleted there).
- **Body weight history**: save your body weight whenever you weigh in. The
  latest weigh-in is your current weight, and past ones are listed (and can be
  deleted).
- **Fitness goals**: set goals for what you're going for, each with a target
  and a progress bar showing how close you are:
  - *Muscle growth*: a lift target, e.g. Squat 140 kg × 5
  - *How I want to look*: a goal body weight, to lose or gain toward
  - *Health habits*: train N days a week, or a custom habit (e.g. "Sleep 8
    hours") that you tick off day by day

  Reaching a goal gives +1 level and a celebration. There's also a one-line
  notes field.
- **Weekly streaks with tough love**: your streak is the number of weeks in a
  row you've logged at least one lift (rest days are fine). If a streak of two
  weeks or more breaks because a whole week went by with no lifts, the log page
  calls you out, without insults, and challenges you to come back. Your first
  lift back earns a +50 XP comeback bonus. The current and best streak are on
  your profile.
- **Keeps your progress**: everything is still there after you close and reopen
  the app.
- **Readable gothic style**: blackletter headings with an easy-to-read serif
  for everything else, at 16px or larger.

Data from an earlier version of Grimlift (round 2) is carried over
automatically the first time you open this version.

See `spec.md` for the exact rules (R1–R12), and `docs/decisions/` for the
reasoning behind key design choices.

## Run

Requires Node.js 18+.

```sh
npm start
```

This installs dependencies and opens the app at http://localhost:5173.
(After the first install, `npm run dev` does the same without reinstalling.)

## Test

```sh
npm test
```

Runs the Vitest suite in `tests/`. Each test name starts with the spec rule it
checks, e.g. `R6.1: a PB gives XP, PB, then level-up events in that order`.
