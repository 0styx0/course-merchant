---
name: plan-create-overview
description: First planning pass for a new area. Agree a short brief, settle only the decisions that change the shape of the work, and write a map of milestones into a new docs/<area>.md that /plan-create-implementation can design one at a time. Use when the owner wants to plan a new feature or area, or says "plan overview".
disable-model-invocation: false
argument-hint: "<area> [brief]"
arguments: [area]
---

# Plan overview

Area: `$area` (becomes `docs/$area.md`). Anything typed after it is the owner's brief: `$ARGUMENTS`. Follow CLAUDE.md's working agreements and the chat rules in [../_shared/chat-rules.md](../_shared/chat-rules.md) throughout (here, "offer more" means for example "ask for the trade-offs"). This pass produces a **map**: milestones, their order, and why. It does not design. `/plan-create-implementation` designs one milestone at a time, so the map must be right about *what* and *in what order*, and must hand over everything that pass reads, in the format of [../_shared/milestone-line.md](../_shared/milestone-line.md).

## 1. Get the brief

Take what the request says; ask for the rest in **one** message: who uses it; must-haves (behaviour the owner would reject the work without); nice-to-haves; out of scope; hard constraints. Add one **scope probe**: for every rule or policy the owner states, what does it cover and what is exempt (for example tests, generated code)? Reversing an exemption later changes the size of a milestone. Repeat the brief back in at most 5 bullets, and ask once "anything else that's a must-have?".

## 2. Research what decides the shape

- Read the Status of the docs this area touches, any spec for it, the rules in `.claude/rules/` and CLAUDE.md that apply, and the matching part of the contract file named in [../_shared/project.md](../_shared/project.md) (grep, never whole).
- For each milestone-to-be, find what it can build on, by grep. Record links, not summaries.
- For each must-have and each milestone, run the library check in [library-check.md](library-check.md): is there a reliable library that is simpler than hand-rolling it? Record the candidates for step 3.
- Facts that can change (counts, lists, versions) are never typed as numbers. Write the command that measures them, and run it once to learn the shape of the problem.

## 3. Settle shape-changing decisions

For each decision ask: **would the answer change which milestones exist, their order or their size?** Yes: settle it now, one at a time through the picker. A new library is usually a Yes (it can remove a milestone or add a "prove it works" one): offer it as an option, library recommended when it passes the check, hand-rolling as the rejected option with its cost. No: write it as an open question, tagged *can wait* or *blocks the split* (definitions in the shared file).

## 4. Draw the milestones

Follow [milestone-checklist.md](milestone-checklist.md) to choose them and [milestone-lines.md](milestone-lines.md) to write them. Mark milestone 1 **Next**.

## 5. Check the map before presenting

Run the self-check in [review.md](review.md), fix what fails, then the subagent review when it applies.

## 6. Present

Use [present.md](present.md). In plan mode present with ExitPlanMode; otherwise end your reply with it.

## 7. After approval, write the doc

- Create `docs/$area.md` from [doc-template.md](doc-template.md), with only the approved decision rows.
- Add the doc to CLAUDE.md's *Design docs* list.
- Docs only. Hand off with the files changed, `` `docs($area): plan the overview` `` as the suggested commit message, and a reminder to `/clear` before `/plan-create-implementation $area`.
