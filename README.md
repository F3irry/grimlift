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
  its own name, preferred unit, body weight, goal, lifts, XP, level, and
  records, and a profile page with stats and a full history (lifts can be
  deleted there).
- **Keeps your progress**: everything is still there after you close and reopen
  the app.
- **Readable gothic style**: blackletter headings with an easy-to-read serif
  for everything else, at 16px or larger.

See `spec.md` for the exact rules (R1–R8).

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
