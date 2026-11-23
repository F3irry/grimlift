# 0002. Derive streaks and the comeback bonus from entries; no new stored state

- Status: accepted (round 4)
- Decided by: me (Claude), following the data-model rule in CLAUDE.md
- Requirement: R12.1, R12.2, R12.5

## Y-statement

In the context of **adding a broken-streak banner and a +50 XP comeback bonus**,
facing **the choice between storing streak state (current streak, "banner
seen", "bonus awarded") and recomputing it**,
we decided for **deriving everything by replaying the profile's entries: the
banner shows whenever the derived state is "broken", and the comeback bonus is
the +50 XP for whichever entry is first after a broken streak**,
and neglected **storing a streak counter or awarded-bonus flags (which would
need a `grimlift:v4` key and a migration question), and a banner that can be
dismissed (which would need a stored flag plus a button outside the log page)**,
to achieve **consistency when entries are deleted (R1.4), no storage change, and
logic that can be tested with plain dates**,
accepting that **the banner can't be dismissed, only cleared by logging a lift,
and that deleting a comeback entry moves the bonus to the next lift back
instead of removing it**.

## Alternatives considered

- **Store a streak counter and update it on each log**: a deleted entry would
  leave the counter wrong unless it is recomputed anyway.
- **Store "bonus awarded" per break**: protects against moving the bonus around
  on delete, but adds stored state that can drift from the entries it
  describes.
- **Dismissable banner**: the user picked "banner until next log", so the
  stored flag wasn't needed.
