# Milestone checklist

Used in step 4 of [SKILL.md](SKILL.md). Answer each for the draft map; fix the map, record only what the next pass needs.

- **Coverage:** is every must-have delivered by a named milestone? Is every milestone needed by a must-have or nice-to-have (otherwise drop or move it to out of scope)?
- **Outcome:** can the owner see or test each milestone alone? A layer ("the database part") is not an outcome.
- **Slice:** milestone 1 is the thinnest path through every layer the area needs (a walking skeleton: ugly is fine, but it runs end to end). A later milestone that ships only a layer must name the milestone that makes it reachable; otherwise rewrite it.
- **Dependencies:** list what each milestone needs. Is the order a valid build order? Does anything need what comes later?
- **Principles:** read each Principle against each milestone, and against every case it governs (a form-wide rule against every input kind: "check on blur" suits typed fields, not pickers). Does any milestone, as written, break one (for example "enforce" before "fix")? Reorder or rewrite the milestone. If the principle is wrong, ask the owner; do not let the plan pass quietly reverse it.
- **Scope of rules:** for every rule or policy, what does it cover and exempt? Which exemption, if reversed, adds work to a milestone? If one would, settle it now.
- **Libraries:** did the [library check](library-check.md) run for every milestone that would hand-roll logic? A milestone that rebuilds what a reliable library does is a candidate to shrink or drop.
- **Risk:** what is the least known part (library behaviour, unclear data, a tool's false alarms)? If it is a question only running code can answer, make it a spike (see [../_shared/milestone-line.md](../_shared/milestone-line.md)), first, with a *Done when* that decides it.
- **Size:** does each milestone split into 2 to 5 independently green commits? Do not name the commits; just check they exist.
- **Existing code and rules:** for each milestone, what does it build on (grep)? Does an existing rule, doc or Decision conflict with it? A conflict that changes the order or size *blocks the split*; settle it now.
- **Cost of being wrong:** which choices are expensive to reverse (data model, public shapes)? Settle those now, even if they feel like detail.
- **Open questions:** each is tagged *blocks the split* or *can wait*, under the milestone that needs it.
