# Grimlift

A dark gothic gym tracker that turns lifting into leveling up. Log your sets,
complete a workout to earn XP, and gain a level whenever you set a new personal
record. Everything runs in your browser and is saved in `localStorage`, so there
is no account, no server, and no API key.

## What it does

- **Log sets fast**: exercise, weight, reps in one form. Exercise names you've
  used before are suggested, and the exercise and weight stay filled in for your
  next set.
- **Earn XP**: completing a workout gives 20 XP + 5 XP per set. Every 100 XP is
  a level.
- **Records level you up**: beating your best on an exercise (heavier weight, or
  the same weight for more reps) gives an instant +1 level for that exercise.
  The first time you log an exercise sets its baseline.
- **Keeps your progress**: workouts, XP, level, records, and your unfinished
  workout are still there after you close and reopen the app.

See `spec.md` for the exact rules (R1.1–R4.3).

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
checks, e.g. `R3.4: several PB sets on one exercise in one workout give one level`.
