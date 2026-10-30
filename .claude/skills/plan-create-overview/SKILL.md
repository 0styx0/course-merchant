---
name: plan-create-overview
description: First planning pass for a new area. Agree a short brief, settle only the decisions that change the shape of the work, and write a one-page map of milestones into a new docs/<area>.md. Use when the owner wants to plan a new feature or area, or says "plan overview".
disable-model-invocation: false
argument-hint: "<area> [brief]"
arguments: [area]
---

# Plan overview

Area: `$area` (becomes `docs/$area.md`). Anything typed after it is the owner's brief or request: `$ARGUMENTS`. Follow CLAUDE.md's working agreements throughout. This pass produces a **map**, not a design: what the milestones are, in what order, and why. Detail is written later, one milestone at a time, by `/plan-create-implementation`, when the code it builds on exists. Detail written now is usually reversed later and costs the owner reading time.

## Chat rules

Follow [../_shared/chat-rules.md](../_shared/chat-rules.md) throughout. Here, "offer more" means for example "ask for the trade-offs", and new topics are collected under *Open questions*.

## 1. Get the brief before anything else

Before any research, make sure you have these five things. Take what the request already says, and ask for the rest in **one** message:

1. **Who** uses it, and how technical they are.
2. **Must-haves:** behaviour the owner would reject the work without (e.g. "pastes from Google Docs and keeps formatting").
3. **Nice-to-haves.**
4. **Out of scope** for now.
5. **Hard constraints:** deadlines, things that must not change, required libraries.

Repeat the brief back in 5 lines or fewer. A must-have found after the map is written can force a rewrite, so ask "anything else that's a must-have?" once.

## 2. Research only what decides the shape

- Read `docs/` Status sections and the docs this area touches, any spec for it (e.g. a "Behaviour" section in the area's doc), and the relevant part of [openapi-v1.yaml](../../../api/openapi/openapi-v1.yaml) (grep, don't read it whole).
- Look at the code only to answer "what already exists that a milestone can build on?". Search for specific things; no open-ended surveys.
- For each must-have, find out whether it forces a choice of library or approach. Check the library's real behaviour in its docs or in `node_modules`, not from memory, and say how sure you are.

## 3. Settle shape-changing decisions, defer the rest

For each decision ask: **would the answer change which milestones exist, or their order?**
- **Yes** (e.g. visual editor vs Markdown, a new package vs local code): settle it now, one at a time through the picker.
- **No** (limits, field names, error messages, file layout, exact library APIs): don't decide it. Write it as an open question under the milestone that will need it.

## 4. Draw the milestones

- 3–7 milestones. Each delivers one outcome the owner can see or test (e.g. "the admin can save a course from the form"), described in one plain-language line.
- Order by dependency. Put the riskiest unknown early, as its own small milestone if needed (e.g. "prove Google Docs paste keeps formatting").
- No commit split, file names, field names or numbers. Those belong to the implementation pass.
- Mark milestone 1 **Next**.

## 5. Present the map (at most ~400 words)

In plan mode, present it with ExitPlanMode; otherwise end your reply with it. Sections, in this order:

1. **Goal:** 1–2 sentences.
2. **Brief:** the 5 lines from step 1.
3. **Milestones:** a numbered list of one-liners.
4. **Decided now:** one row per shape-changing decision, in the doc's `| Decision | Why | Rejected |` format, short.
5. **Open questions:** one line each, tagged with the milestone that will settle them.
6. **Out of scope.**

If the owner asks for a review, give a subagent only this map plus the files you read, and ask for the **top 3 problems in ≤200 words**. Pass on its points briefly and say which you agree with.

## 6. After approval, write the doc

- Create `docs/$area.md` following the shape of the existing docs (e.g. [auth.md](../../../docs/auth.md)): a short intro (what it is, "run with `/plan-create-implementation $area`, then `/next-commit $area`", which docs it relates to), then **Status** (the milestones as unticked items, the first marked **Next**), **Principles** (from the brief), **Decisions** (the approved rows), **Open questions** (by milestone) and **Out of scope**.
- Add the doc to CLAUDE.md's *Design docs* list,.
- Docs only, no code. Hand off with the files changed, a suggested conventional commit message (`docs($area): plan the overview`), and a reminder to `/clear` before `/plan-create-implementation $area`.
