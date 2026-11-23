# 0004. Store limitations as a dated history, not one current value

- Status: accepted (round 5)
- Decided by: me (Claude), as a consequence of the user's choices (limitations,
  migrated `grimlift:v4` storage, auto weekly challenges worth XP)
- Requirement: R13.1, R13.7

## Y-statement

In the context of **weekly challenges whose +30 XP is recomputed from stored
records (the CLAUDE.md data-model rule), where a week's challenges depend on the
profile's limitations**,
facing **the problem that recomputing a past week with today's limitations
would change XP that was already earned (protecting knees today would remove
the XP from a squat challenge finished a month ago)**,
we decided for **storing limitations as a list of dated records, with at most
one record per week (a save in the same week replaces it), and building each
week's challenges with the limitations in force when that week ended**,
and neglected **a single current-limitations object, storing each week's
challenges or completed-challenge flags, and leaving limitations out of
challenges altogether**,
to achieve **past challenge XP that never changes when limitations are edited,
"limitations always win" for the current week as soon as they're saved, and no
stored derived totals**,
accepting that **the saved shape is slightly bigger than a single object, that
editing limitations mid-week can remove a challenge already completed this week
(and its 30 XP), and that changing experience mid-week changes this week's lift
step**.

## Alternatives considered

- **One current value**: simplest, but past XP and levels would move every time
  the user edited their limitations. A level could even drop because of a
  checkbox.
- **Store each week's challenges or a "completed" flag**: freezes the past, but
  it is stored derived state that drifts from the entries it describes. Deleting
  a mistaken lift would no longer remove the XP it earned. That breaks R1.4's
  "as if it had never been logged".
- **Challenges ignore limitations**: avoids the problem, but contradicts the
  user's choice that limitations always win.
- **Keep every save (no weekly collapse)**: only the last save before a week
  ends matters, so earlier saves in the same week would be dead data.
