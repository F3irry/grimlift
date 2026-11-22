# Handoff: end of round 2

For the session that does round 3. Read `CLAUDE.md` first (standing rules), then
`problem.md` and `spec.md`. This file covers only what's specific to where
round 2 left off.

## Current state

- Branch `master`, pushed to `origin/master` (https://github.com/F3irry/grimlift).
  Last commit: `1fe0648 Update README for round 2 features`. Working tree was
  clean apart from this file and uncommitted CLAUDE.md edits.
- `npm test`: 5 files, 53 tests, all passing.
- `npx vite build` succeeds.
- `spec.md` is the round-2 spec: R1–R8 with sub-rules (R1.1 … R8.5).
- The app has three hash routes: `#/log` (log form, recent lifts),
  `#/profile` (stats, records, edit details, history with delete, delete
  profile), and `#/new` (create a profile; shown automatically when none exist).

Commit history by round:

| Round | Commits |
|---|---|
| 0 | `61c8598` problem.md (user's own; never touch) |
| 1 | `a17eed4` spec → `612d3e7` scaffold → `b4264fd` tests → `34a9ed3` logic → `dc302a8` UI → `394e41c` README |
| 2 | `cf3ceca` spec → `272f344` tests → `2595653` logic → `7b4516c` UI → `1fe0648` README |

## How to run and test

```sh
npm start      # installs, then opens http://localhost:5173
npm run dev    # same, without reinstalling
npm test       # Vitest, once
```

The test files:

- `tests/entries.test.js`: validation, names, units (R1, R3.1, R3.5)
- `tests/progression.test.js`: XP, PBs, level, delete, feedback events (R1–R3, R6.1)
- `tests/profiles.test.js`: profiles and stats (R8)
- `tests/storage.test.js`: localStorage with a fake storage object (R4)
- `tests/ui.test.js`: static checks of `index.html` and `style.css` (R5, R7).
  Runs in happy-dom.

To check the real UI in a browser, I used puppeteer-core with the installed
Edge, from a throwaway folder outside the repo. That script lived in the session
scratchpad and is gone. Recreate it like this:
`npm i puppeteer-core` in a temp dir, then launch with
`executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'`,
start `npx vite --port 5179 --strictPort` in the repo, drive the forms, and take
screenshots. Don't add puppeteer to the project's dependencies unless the user
agrees.

## Decisions made in round 2, and why

All of these came from asking the user, except where noted.

1. **One button logs and rewards right away. The draft and "Complete
   workout" step are gone.** R6 (feedback on every set) and R7 (one form, one
   button) conflicted with round 1's two-button session flow. The user picked
   this option. Each log is an "entry" and counts as a workout.
2. **XP per entry = 20 + 5 × sets.** This keeps round 1's formula, now per
   entry. Every 100 XP is a level.
3. **Each PB entry = +1 level.** One entry is one exercise, so round 1's "one
   level per exercise per workout" became one level per PB entry.
4. **PB rule (from round 1): heavier, or the same weight with more reps.**
   Round 2 compares weights in kg (1 lb = 0.45359237 kg) and treats weights
   within 0.01 kg as equal, so 100 kg and 220.462 lb are the same weight. That
   tolerance was my call, made to avoid float noise.
5. **Several profiles with a switcher, no password.** The user's choice. A
   profile stores name (unique ignoring case, ≤ 40 characters), preferred unit,
   optional body weight (stored in kg), and an optional goal (≤ 140 characters).
   The profile page shows a stats summary.
6. **Round-1 saved data starts fresh.** The user's choice. The new key is
   `grimlift:v2`, and `grimlift:v1` is never read.
7. **Totals are derived, not stored** (my design call). A profile stores only
   its entries, and XP, PB levels, and records are recomputed by replaying them.
   I did this so deleting an entry (R1.4) is always consistent.
8. **Entries can be deleted, from the profile page's Chronicle list only.** On
   the log page that would add buttons and break R7's one-button rule.
9. **Fonts:** Crimson Pro for body text at 18px, UnifrakturCook only on h1–h3.
   The level number is now in the body font, because R5 restricts blackletter to
   headings.
10. **R5 and R7 are tested by reading the HTML and CSS as text.** It's a
    lightweight way to keep those requirements from regressing without a
    browser test runner.

## Unresolved / not done

- **Meals and per-body-part guidance** are in `problem.md` but not yet in any
  requirement. They're listed as out of scope in `spec.md`. Ask the user before
  starting them.
- **No automated tests for the UI's behaviour.** The feedback animations (R6.2),
  the XP bar (R2.3), routing, and the profile page are only covered by the logic
  tests plus a one-off headless-browser check.
- **XP can be farmed** by logging many tiny entries, and **levels can go
  down** when a PB or XP entry is deleted. Both follow the spec as written, but
  the user never explicitly confirmed the level drop.
- **No undo** for deleting an entry. Deleting a profile asks for confirmation
  with `window.confirm`; deleting an entry doesn't ask.
- **No export or backup.** All data is in one browser's localStorage. Clearing
  site data loses it.
- **Old `grimlift:v1` data is left in localStorage** (ignored, not deleted).
- **The favicon is missing**, which causes a harmless 404 in the console.
- **Fonts load from Google Fonts.** The app works offline but falls back to
  Georgia.

## Warnings for the next session

- **Commit `2595653` is a broken in-between state.** Its logic is complete but
  the UI still imported the deleted `workout.js`; `7b4516c` fixed it. Don't
  bisect into it expecting a working app. Next time, keep each commit runnable
  (for example, put a logic change that breaks the UI in the same commit as the
  UI fix, or add the new modules before deleting the old ones).
- **Environment:** Windows. The Bash tool is Git Bash, and PowerShell is also
  available. Git prints `LF will be replaced by CRLF` on every add; that's
  harmless.
- **Background dev servers get killed** when the machine runs low on memory
  (this happened in round 2). If the user asks for `npm run dev`, start it in
  the background and confirm it answers on :5173, but don't restart it on your
  own after a kill.
- **To stop a server you started on a port**, use PowerShell:
  `Get-NetTCPConnection -LocalPort <port> -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.
- **`main.js` quirk:** `renderLog` and `renderProfile` reset form fields only
  when the active profile changes (tracked in `lastProfileId`). If you add
  fields, follow that pattern or switching profiles will leave stale values.
- **Ask about storage first:** if round 3 changes the saved data shape, ask the
  user about migrating `grimlift:v2` data before you write the spec (see
  CLAUDE.md).
- **Don't commit this file or the CLAUDE.md edits.** The user reviews them
  first.
