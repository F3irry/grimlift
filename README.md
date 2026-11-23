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
- **What to train, by body part**: the Train page suggests a couple of
  exercises for legs, back, chest, shoulders, arms, and core, with sets × reps.
  Exercises from your lift goals come first, then ones you already do. Each has
  a "Log it" link that opens the log form with the exercise filled in. With no
  goals yet, you get a simple one-move-per-body-part starter plan.
- **Your limitations come first**: on your profile, tick body areas to protect
  (knees, hips, lower back, shoulders, elbows, wrists), and set the equipment
  you have and your experience. Anything that loads a protected area or needs
  missing equipment is never suggested, even if a goal names it. The Train page
  tells you which goal is on hold and what to do instead.
- **Weekly challenges, +30 XP each**: up to three small challenges every week,
  set from your goals: train a number of days (one more than last week, never
  more than 6, or a rest day after a 7-day week), weigh in (with a healthy pace
  of at most 1% of body weight a week when losing, 0.5% when gaining), and a
  small step on a lift goal (2.5% heavier for beginners, 5% otherwise, or one
  more rep). If your weight is changing faster than that pace, the Train page
  warns you to slow down.
- **Meals for your goals**: the Fuel page suggests a breakfast, lunch, dinner,
  and snack from a built-in meal list, picked by what you're going for: high
  protein for lift goals, filling and lighter for losing weight, energy-dense
  for gaining, and carbs plus protein to fuel training habits. Each meal says
  why it fits. Tick your diet on the profile's limitations (vegetarian, vegan,
  no dairy, no nuts, no gluten, no pork), and nothing it rules out is ever
  suggested. Meals are suggestions only: no meal log, no calorie counting, no
  XP.
- **Keeps your progress**: everything is still there after you close and reopen
  the app.
- **Readable gothic style**: blackletter headings with an easy-to-read serif
  for everything else, at 16px or larger.

Data from earlier versions of Grimlift (rounds 2–5) is carried over
automatically the first time you open this version.

Exercise and meal suggestions are general, not medical advice. If something
hurts, stop and ask a professional. Packaged foods can contain traces of what
your diet rules out, so check labels, and ask a doctor or dietitian about
allergies, health conditions, or how much to eat.

See `spec.md` for the exact rules (R1–R14), and `docs/decisions/` for the
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
