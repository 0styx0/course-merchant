# Map review

Used in step 5 of [SKILL.md](SKILL.md).

## Self-check (always)

For each milestone:
- Does it pass [milestone-checklist.md](milestone-checklist.md)?
- Could `/plan-create-implementation` split it into 2 to 5 commits that each pass [../_shared/commit-size.md](../_shared/commit-size.md), from its step and the doc alone?
- Does it have the fields [../_shared/milestone-line.md](../_shared/milestone-line.md) requires for its place (all of them for **Next**, fewer for the rest), with a *Done when* you could run?
- Is each *Re-measure* a command, and does it run? Is there a typed count with no command?

Across the map:
- Walk the Principles one by one against the milestones. Any contradiction?
- Is every must-have covered, and nothing else added?
- Does the order hold if a milestone is delayed or dropped?
- Is any Decision something the owner never approved?
- Does any milestone hand-roll what a reliable library already does, with no library-check result?

## Subagent review (only when the map has a decision row)

Give a subagent only the map and the files it names. Ask for at most 5 problems in 250 words: missing or oversized milestones, wrong order or hidden dependency, a principle contradicted, a blocking question marked *can wait*, a fact typed as a number, hand-rolled logic where a reliable library exists. Report which you accept and fix, and which you reject with a reason. Do not relay the full list.
