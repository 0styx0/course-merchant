---
name: plan-create-overview
description: First planning pass for a new area. Agree a short brief with user journeys, settle only the decisions that change the shape of the work, and write a map of milestones into a new docs/<area>.md that /plan-create-implementation can design one at a time. Use when the owner wants to plan a new feature or area, or says "plan overview".
model: opus
effort: high
argument-hint: "<area> [brief]"
arguments: [area]
---

# Plan overview

Area: `$area` (becomes `docs/$area.md`). `$ARGUMENTS` is the area followed by the owner's brief; the brief is everything after the area name. If `$area` is empty, ask which area in plain chat and stop.

This pass produces a **map**: milestones, their order, and why. It does not design. `/plan-create-implementation` designs one milestone at a time, so the map must be right about *what* and *in what order*, and must hand over everything that pass reads.

**Run in plan mode.** The `model` and `effort` lines above last only for the turn that starts the skill; after that the session's settings apply (`opusplan` gives Opus in plan mode and Sonnet outside it). If plan mode is off, tell the owner to switch it on before you continue.

## 0. Read now

Read [../_shared/chat-rules.md](../_shared/chat-rules.md), [../_shared/milestone-line.md](../_shared/milestone-line.md) and [../_shared/project.md](../_shared/project.md). Read [library-check.md](library-check.md) at step 2 and [milestone-checklist.md](milestone-checklist.md) at step 4. Follow CLAUDE.md's working agreements throughout (here, "offer more" means for example "ask for the trade-offs").

## 1. Get the brief

Take what the request says; ask for the rest in **one** message:
- who uses it;
- must-haves (behaviour the owner would reject the work without);
- nice-to-haves, out of scope, hard constraints;
- **2 to 3 user journeys**, each one sentence, for example "the admin fixes a typo in a published course". Skip this only for an area with no screen;
- one **scope probe**: for every rule or policy the owner states, what does it cover and what is exempt (for example tests, generated code)? Reversing an exemption later changes the size of a milestone.

Repeat the brief back in at most 5 bullets, and ask once "anything else that's a must-have?".

## 2. Research what decides the shape

- Read the Status of the docs this area touches, any spec for it, the rules in `.claude/rules/` and CLAUDE.md that apply, and the matching part of the contract file named in project.md (grep, never whole).
- For each milestone-to-be, find what it can build on, by grep. Record links, not summaries.
- **Size from the code.** For each milestone-to-be, grep the files it would touch and list the existing "twin" code it must share (create/edit, list/detail). This list is the evidence for *Size*; an estimate made without it was wrong on every milestone of the course-edit area.
- For each must-have and each milestone, run the library check in library-check.md. Record the candidates for step 3.
- Facts that can change (counts, lists, versions) are never typed as numbers. Write the command that measures them, and run it once to learn the shape of the problem.

## 3. Settle shape-changing decisions

For each decision ask: **would the answer change which milestones exist, their order or their size?** Yes: settle it now, one at a time, with the `decision-card` skill (it shows each option's before and after, code and cost, then asks the pick through the picker). A new library is usually a Yes (it can remove a milestone or add a "prove it works" one): offer it as an option, library recommended when it passes the check, hand-rolling as the rejected option with its cost. No: write it as an open question, tagged *can wait* or *blocks the split* (definitions in milestone-line.md).

## 4. Draw the milestones

Follow milestone-checklist.md (it covers how to choose and how to write them). Mark milestone 1 **Next**. For an area with screens, also draw the **whole-page sketch**: one ASCII wireframe of the finished page or flow, sections in order, with the empty state. Then draw each milestone's *Sketch*: the page as it looks once that milestone ships, grown from the previous milestone's. Reading the sketches in order shows the page evolve.

## 5. Check the map before presenting

Run the checklist in milestone-checklist.md against the draft map. Then, only when the map has a decision row, call the `plan-reviewer` agent (Agent tool, `subagent_type: plan-reviewer`) with the draft map and the files it names, and say it is a **map**. Report which findings you accept and fix, and which you reject with a reason. Do not relay its full list.

Then run `/plan-ripple` on the draft (the plan file stands in for the doc until step 7) and add its table to the map as *Docs touched*.

Also across the map:
- Is every must-have covered, and nothing else added?
- Does the order hold if a milestone is delayed or dropped?
- Is any Decision something the owner never approved?
- Is each *Re-measure* a command that runs? Is there a typed count with no command?

## 6. Present

Bullets only, at most ~500 words (this overrides the word cap in chat-rules.md), in this order so the owner can stop after the second section. In plan mode, present with ExitPlanMode. Outside plan mode, end your reply with the presentation and wait for approval.

1. **Summary:** the goal in one bullet, the number of milestones, what is **Next**, what changed from the brief.
2. **Questions for you:** anything open that *blocks the split* (usually few).
3. **Brief:** the 5 bullets from step 1, then the journeys.
4. **Whole-page sketch**, when the area has screens.
5. **Milestones:** each as its Status line, then *Needs*, *Size* and *Done when* on one line, and its *Sketch* for an area with screens.
6. **Proposed decision rows:** the exact `| Decision | Why | Rejected |` text. For each rejected option: what it would give, cost and complexity. Only strong contenders. A row deciding what shows, where, or in what order on a page ends its *Why* with "(revisit after use)".
7. **Open questions:** one line each, with the milestone and *blocks the split* or *can wait*.
8. **Out of scope.**
9. **Review result:** one line per accepted or rejected finding.
10. **Docs touched:** the `/plan-ripple` table.
11. **Terms:** each specialized term the map uses (CLAUDE.md *Plain language*).

Link and diagram formats: [../_shared/output-format.md](../_shared/output-format.md).

## 7. After approval, write the doc

- **The approved plan file is the doc body.** Copy its sections into `docs/$area.md` (shape in [doc-template.md](doc-template.md)), with only the approved decision rows, every milestone's *Sketch*, and a *Terms* section. Never rewrite the doc from memory. A follow-up request (a question, a revision) edits the plan file; it never overwrites it, so approved text and sketches survive.
- Add the doc to CLAUDE.md's *Design docs* list, and make the *Docs touched* edits that are status or plan text. Propose the Decision-row edits and wait for the owner's OK.
- Run `/plan-cold-read $area` and fix what it reports as *Fix now*; ask the owner about the rest. Run `/plan-ripple $area` once more.
- Docs only. Hand off with the files changed, `` `docs($area): plan the overview` `` as the suggested commit message, and a reminder to `/clear` before `/plan-create-implementation $area`.
