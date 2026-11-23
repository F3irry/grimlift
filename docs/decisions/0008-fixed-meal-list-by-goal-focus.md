# 0008. A fixed meal list, one meal per slot for each goal focus

- Status: accepted (round 6)
- Decided by: the user chose a built-in meal list (no internet or API), a reason
  on each meal, a not-medical-advice note, a new Fuel tab, and suggest-only (no
  XP); I (Claude) chose the four focuses, the one-meal-per-slot shape, the
  food-group tags, and the meals themselves
- Requirement: R14.2–R14.6

## Y-statement

In the context of **suggesting meals that help with the user's goals while
never including anything their diet rules out**,
facing **goals of four different types, 64 possible diet combinations, and the
need to stay small, offline, and clearly not medical advice**,
we decided for **four focuses from active goals (muscle from lift goals, lean
or gain from the oldest body-weight goal's direction, fuel from training or
habit goals or no goals), each showing the first allowed meal per slot
(breakfast, lunch, dinner, snack) from a fixed, ordered list of 24 meals tagged
with seven food groups, with a test that every focus and slot has a meal with no
tags at all**,
and neglected **calorie or macro targets, per-goal meal plans, rotating or
random meals, and a meal per goal instead of per focus**,
to achieve **suggestions that are deterministic and testable, always complete
for every diet combination, and that say why they fit without giving numbers
that would read as dietary prescriptions**,
accepting that **the list is short and the same each day, that the tags are my
judgment and err on the cautious side (oats count as gluten, peanuts as nuts)
but don't cover other allergens such as soy or sesame, and that conflicting
body-weight goals only use the oldest one**.

## Alternatives considered

- **Calorie or macro targets from body weight**: closer to a meal plan, but it
  is personal dietary advice, which is out of scope.
- **Rotate meals by week or day**: more variety, but less predictable and
  harder to test; it can be added later without changing stored data.
- **A meal list per goal**: repeats the same "high protein" set for every lift
  goal; grouping by focus keeps the page short.
