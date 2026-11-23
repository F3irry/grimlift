# 0001. Streaks count training weeks, not days

- Status: accepted (round 4)
- Decided by: the user, from options I offered
- Requirement: R12 (spec R12.1, R12.2)

## Y-statement

In the context of **R12, which asks for tough love "when a streak breaks" in an
app that had no streaks yet**,
facing **the need to define a streak so a break is meaningful and not
constant**,
we decided for **a streak of training weeks (Monday–Sunday weeks with at least
one logged lift), broken only after a whole empty week that follows a run of 2+
weeks**,
and neglected **daily streaks, streaks of weeks meeting the weekly training
goal (R11.4), and separate streaks per weekly goal**,
to achieve **a streak that allows rest days, matches the week logic already in
`dates.js`, works for every profile even with no goals, and gives a break the
weight that tough love needs**,
accepting that **someone who trains once a week keeps a streak as easily as
someone who trains five times, and a break is noticed only once the empty week
has ended (up to 13 days after the last lift)**.

## Alternatives considered

- **Daily streak**: every rest day would break it. Strength training needs rest
  days, so the app would scold the user for doing the right thing.
- **Weeks meeting the weekly training goal**: only works for profiles with a
  training goal and ties two features together. Changing or deleting the goal
  would change the streak's history.
- **Per-goal streaks**: several banners could appear at once, and custom habits
  are not workouts.
- **Minimum length 1 or 3**: the user picked 2. With 1, a single lift followed
  by a gap would count as a "broken streak". 3 would wait too long.
