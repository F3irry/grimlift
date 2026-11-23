# 0003. Tough love comes from a fixed, tested message list

- Status: accepted (round 4)
- Decided by: me (Claude)
- Requirement: R12.3, R12.4

## Y-statement

In the context of **R12's "challenge and push, but never insult or degrade"**,
facing **a requirement about tone that is hard to check automatically**,
we decided for **a small fixed list of hand-written messages, picked by the
lost streak's length (`lostWeeks % 4`), checked by tests that every message
names the lost streak, contains a call to action, and contains none of a list
of shaming words**,
and neglected **random message choice, messages composed from fragments, and
leaving tone to manual review only**,
to achieve **messages that a person has read in full, the same text every time
for the same break (so tests are deterministic and the banner doesn't change
on every render), and a regression check if someone later adds a harsher
line**,
accepting that **the word-list test only catches obvious insults (a degrading
sentence without any listed word would pass), so new messages still need a
human read, and that there are only four messages**.
