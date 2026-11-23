# 0007. Diet lives in the limitations record, and v4 data is migrated to v5

- Status: accepted (round 6)
- Decided by: the user chose a diet pick-list on the limitations form, no
  free-text health info, and migrating saved data; I (Claude) chose to store it
  inside each dated limitations record
- Requirement: R13.1, R14.1, R4.7

## Y-statement

In the context of **adding a diet pick-list (vegetarian, vegan, no dairy, no
nuts, no gluten, no pork) to the existing limitations form**,
facing **a choice between a new field on the profile and a field inside the
dated limitations history that round 5 already stores (0004)**,
we decided for **a `diet` list in every limitations record, saved by the same
form button and the same "replace this week's record" rule, with saved data
moving to `grimlift:v5` and every v4 record migrated with an empty diet**,
and neglected **a separate `profile.diet` field, a separate form and save
button, and reading v4 records with a missing diet as empty without a new
key**,
to achieve **one form and one save for everything the app must respect, a
shape that follows the existing history code, and a migration that follows the
CLAUDE.md rule that a shape change gets a new key**,
accepting that **diet gets a dated history nobody needs yet (meals use only the
current diet), and that a diet change replaces this week's limitations record
like any other limitations edit (harmless, since diet never changes exercises,
challenges, or XP; a test checks that)**.

## Alternatives considered

- **`profile.diet` beside the history**: simpler data, but the form would save
  two things in two places, and the form and record would no longer match.
- **Separate diet form on the Fuel page**: the user asked for it on the
  limitations form, and a form on the Fuel page would look like meal tracking.
- **Keep `grimlift:v4` and treat a missing diet as none**: no migration code,
  but it breaks the standing rule and makes the v4 validator accept two shapes.
