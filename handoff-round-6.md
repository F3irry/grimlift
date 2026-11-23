# Handoff: end of round 6

For the session that does round 7. Read `CLAUDE.md` first (standing rules,
including the new Environment section, the meals/diet rules, and the Fuel page
UI constraints), then `problem.md`, `spec.md`, and `docs/decisions/`
(0001–0008). This file covers only what's specific to where round 6 left off.

## Current state

- Branch `master`, pushed to `origin/master` (https://github.com/F3irry/grimlift).
  Last commit: `2031e9c Update README for round 6: Fuel page, diet, meal
  suggestions`. The working tree is clean except for this file and uncommitted
  CLAUDE.md edits that the user is reviewing.
- `npm test`: 12 files, 230 tests, all passing.
- `npx vite build` succeeds (delete `dist/` afterwards).
- `spec.md` is the round-6 spec: R1–R14. Round 6 added R14 (meal suggestions)
  and R4.7 (v4 → v5 migration), and changed R4.1, R4.6 (note only), and R13.1
  (diet). The out-of-scope line now names meal tracking, calorie or macro
  counting, and free-text health info.
- Saved data is now **`grimlift:v5`** (`version: 5`). Each limitations record
  gained `diet: []`. Load order: v5 → v4 (migrated) → v3 (migrated twice) → v2
  (migrated three times) → fresh. Broken v5 data starts fresh; it does not fall
  back to older keys.

Round 6 commits:

| Step | Commit |
|---|---|
| requirements (user) | `b3b8a81` |
| spec + CLAUDE.md | `151c250` |
| tests (failing at that commit) | `c8c9674` |
| logic + storage | `1b7bc63` |
| UI | `7212b8c` |
| decision records 0007–0008 | `4bf6530` |
| README | `2031e9c` |

`c8c9674` is a deliberately failing commit (the tests landed before
`meals.js` and the diet field). Every later commit passes.

## How to run and test

```sh
npm start      # installs, then opens http://localhost:5173
npm run dev    # same, without reinstalling
npm test       # Vitest, once
npx vite build # build check; then delete dist/
```

Test files (test count):

- `tests/entries.test.js` (11): validation, names, units (R1, R3.1, R3.5)
- `tests/progression.test.js` (22): XP, PBs, level, delete, feedback (R1–R3, R6.1)
- `tests/profiles.test.js` (15): profiles, account edits, stats (R8, R9)
- `tests/bodyweight.test.js` (7): weigh-ins (R10)
- `tests/goals.test.js` (22): goals (R11)
- `tests/storage.test.js` (22): localStorage, v2/v3/v4 migration (R4)
- `tests/streaks.test.js` (25): streaks, tough love, comeback (R12)
- `tests/limitations.test.js` (11): R13.1, now with diet
- `tests/exercises.test.js` (22): catalog, allowed, suggestions (R13.2–R13.6, R13.14)
- `tests/challenges.test.js` (35): challenges, challenge XP, pace (R13.7–R13.12, R13.14)
- `tests/meals.test.js` (23, new): diet rules, meal list, focuses, suggestions
  for all 64 diet combinations, suggest only, tone (R14.1–R14.6)
- `tests/ui.test.js` (15): static markup checks (R5, R7, R12, R13, R14)

`tests/helpers.js` is unchanged: `at(day, hour)` (local Nov 2026; `at(23)` is
Monday 23 Nov), `newProfile()`, `lift()`, `SHAMING`.

## What round 6 built

- `src/logic/limitations.js`: `DIETS` (vegetarian, vegan, noDairy, noNuts,
  noGluten, noPork), `DIET_LABELS`. `DEFAULT_LIMITATIONS` and every record now
  have `diet`. `validateLimitations` accepts `diet` as an array, a single
  string, or missing (→ `[]`), and rejects unknown values.
- `src/logic/meals.js` (new): `SLOTS`, `SLOT_LABELS`, `FOOD_GROUPS` (meat, pork,
  fish, dairy, eggs, nuts, gluten), `FOCUSES` (muscle, lean, gain, fuel),
  `DIET_RULES`, `FOCUS_INFO` (title and why for each focus), `MEALS` (24 meals:
  name, slot, contains, fits), `ruledOut(diet)`, `mealAllowed(meal, diet)`,
  `focusesFor(profile)` → `[{ focus, goals: [labels] }]`,
  `mealSuggestions(profile)` → `[{ focus, goals, title, why, meals: [{ slot,
  slotLabel, name }] }]`. No `now` parameter: nothing in it depends on the date.
- `src/storage.js`: `STORAGE_KEY = 'grimlift:v5'`, `V4_KEY`, `migrateV4`; the
  load chain uses a small `checked()` helper.
- `profiles.js`: `createApp()` is version 5.
- UI: a **Fuel** tab (`#/fuel`, `#fuel-page`) between Train and Profile; meal
  cards by focus (`.focus` in `style.css`); a diet fieldset in `#limits-form`;
  the limitations save message now mentions the Fuel page.

## Decisions made in round 6, and why

From the user (some answered before this session, two asked here):

1. **Meal suggestions are in scope; meal tracking is not.**
2. **Diet is a short pick-list on the limitations form**, the six options
   above. No free-text health info. Meals never include what the diet rules out.
3. **Built-in meal list**, no internet or API. Each meal shows why it fits.
4. **Every meal screen says it's not medical advice.**
5. **Migrate saved data** (v4 → v5), don't wipe it.
6. **Keep the dark gothic look and adrenaline vibe; keep the round small.**
7. **A new Fuel tab** rather than a section on the Train page (asked this
   session).
8. **Suggest only**: no XP, nothing stored (asked this session).

Mine (listed for the user at the end of round 6; none vetoed, none explicitly
approved):

9. **Diet lives inside each dated limitations record** (`docs/decisions/0007`),
   saved with the same button and the same "replace this week's record" rule.
10. **Four focuses from active goals** (`0008`): muscle from lift goals; lean or
    gain from the *oldest* active body-weight goal's direction; fuel from
    training/habit goals, or when there's no active goal. Order: muscle, lean,
    gain, fuel. Reached goals don't count.
11. **One meal per slot per focus, first match in list order.** No rotation, no
    calories, no portions. The same meals show every day.
12. **The 24 meals and their tags.** Conventional meals first, the
    tag-free (vegan, gluten-free, nut-free) meals last, so a user with no diet
    sees ordinary food, and every diet combination still gets four meals.
13. **Cautious tags**: oats = gluten, peanuts = nuts, tamari named
    "gluten-free tamari".
14. **The safety note also mentions traces in packaged foods** and to ask a
    doctor or dietitian about allergies, conditions, or how much to eat.
15. **Wording**: "Fuel the grind", "Built for muscle", "Lean and full", "Bulk it
    up", "Fuel the work", the why lines, and "Goal: …" / "Goals: …" under each
    heading (changed from "For …" after the browser check showed "For Reach
    75 kg").
16. **The fuel goal prompt appears only when the profile has no goals at all**
    (same as Train). With goals that are all reached, the page shows the fuel
    focus with no prompt and no goal names.

## Unresolved / not done

- **The user hasn't reacted to the meals or the wording.** Ask.
- **Nobody with nutrition knowledge has checked the meal list or its tags.**
- **Allergens beyond the six options** (soy, sesame, shellfish, eggs on their
  own) aren't covered. Several tag-free meals are soy-heavy (tofu, edamame,
  tamari) and hummus has sesame. The safety note points to a professional, but
  a "no soy" or "no eggs" option would need new tags on every meal.
- **No variety**: the same four meals per focus every day.
- **The diet history isn't used**: only the current diet matters. It's stored
  per week because it shares the limitations record.
- **Conflicting body-weight goals** (one lower, one higher) use only the oldest.
- **"Vegetarian" allows eggs and dairy**; there's no pescatarian or
  "no eggs" option.
- Carried over from round 5: user reaction to challenge numbers and wording;
  exercise catalog accuracy; thin shoulder options with bodyweight only; habit
  and training goals have no challenges of their own; small challenge-XP
  farming; no challenge stats on the profile; renamed-exercise mismatch between
  goals and logs; "advanced" ≈ "intermediate"; no automated UI behaviour tests.
- Older carry-overs: XP farming via tiny entries; levels can go down on delete;
  no undo or export; old `grimlift:v1` data left in storage; missing favicon
  (harmless 404); fonts from Google Fonts; comeback-bonus farming and the
  long-lapse banner from round 4.

## Warnings for the next session

- **Old keys are never deleted.** A user now may have v2, v3, v4, and v5 keys
  side by side. If v5 is ever broken, the app starts fresh rather than falling
  back, so the older keys are dead weight. Leave them unless the user decides.
- **Test-date vs real-date**: the test dates are Nov–Dec 2026 and the real date
  this round was 22 Nov 2026. Tests that touch XP pass an explicit `now`
  (standing rule); `meals.js` has no date logic, but its tests build profiles
  with goals whose "reached" state is date-independent.
- **Reordering `MEALS` changes which meal is suggested.** `tests/meals.test.js`
  checks "first fitting meal in list order" generically, plus spot checks on a
  few names (e.g. "Greek yogurt with berries and oats"). Renaming those breaks
  tests.
- **Diet edits replace this week's limitations record**, same as area or
  equipment edits. Harmless now because diet never touches challenges, but if a
  future rule makes diet affect XP, that would rewrite this week's past XP.
- **The browser check seeded v4 data** to test the migration. The headless
  run's saved limitations record used the real clock (Sunday 22 Nov local), so
  it replaced the seeded record from the same week. That's correct behaviour,
  not a bug.
- **The `#limits-form` save button** now has `justify-self: start` so it doesn't
  stretch on the row below the diet fieldset.
- **Don't commit this file or the CLAUDE.md edits.** The user reviews them
  first. Earlier handoff files (`handoff-round-2/4/5.md`) are tracked in git
  because the user committed them; that's their call, not a sign to commit this
  one.
