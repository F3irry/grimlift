# 0005. Weekly challenges are set from data before the week and capped at small steps

- Status: accepted (round 5)
- Decided by: the user chose automatic weekly challenges worth +30 XP, small lift
  steps (about 2.5% for beginners, up to 5%), at most 6 training days with a
  rest day after a 7-day week, and limitations always winning. I (Claude)
  chose the exact formulas, the week-start rule, the order, and the cap of three.
- Requirement: R13.7, R13.8, R13.9

## Y-statement

In the context of **R13's "challenges based on goals and limitations, pushing in
healthy ways"**,
facing **the choice of what a challenge targets and when its target is fixed**,
we decided for **up to three challenges a week (train or rest, then body
weight, then lift goals oldest first), each set only from entries and weigh-ins
saved before Monday, with lift targets of `best × (1 + 2.5% or 5%)` rounded
down to 0.5 kg / 1 lb and capped at the goal (or +1 rep if the step is too small
to load), and training days ramping by at most one day over last week, capped
at 6**,
and neglected **targets that follow the user's latest lift during the week,
challenges that jump straight to the goal, user-accepted challenges with stored
state, and an uncapped list of challenges**,
to achieve **a target that doesn't move mid-week (logging a heavy set on Tuesday
doesn't raise Wednesday's target), progress that is always a small, reachable
step, and a short list that a shy user can face**,
accepting that **someone who is ahead of the plan still gets a modest target
until next Monday, that a fourth goal gets no challenge in a busy week, and that
rounding down to 0.5 kg needs fractional plates for light lifts (the +1-rep
fallback covers the lightest cases)**.

## Alternatives considered

- **Target follows the latest lift**: the bar would keep moving while the user
  chased it, and a test of "done" would depend on the order of sets.
- **Rounding up or to the nearest increment**: rounding up could exceed the 5%
  cap the user picked (2.5% of 5 kg rounds up to 10% more).
- **One challenge per goal, no cap**: with 12 goals that's 12 challenges a
  week. Too much for the problem in `problem.md` ("I get shy and lose
  motivation").
- **Accept to start**: the user picked automatic challenges, so no buttons or
  stored state.
