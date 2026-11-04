---
name: plan-ripple
description: Find every other place in the repo that a design doc's Decisions, Principles and Status now contradict or duplicate, and list the edits that keep all docs in agreement. Use when the owner says "ripple", "check conflicts" or "what else does this change", and from /plan-create-overview steps 5 and 7, after a doc gains a Decision row.
model: opus
effort: high
argument-hint: "<doc path or area>"
arguments: [doc]
---

# Plan ripple

Doc: `$doc`. A path is used as given; a bare area name means `docs/$doc.md`. If the file is missing, say so in one plain sentence and stop.

A new doc replaces or narrows rules written in older docs. Without this pass, the conflicts surface late, one at a time, while the code is being built. Read [../_shared/project.md](../_shared/project.md) for the repo facts. Follow CLAUDE.md's *Writing* rules.

## 1. Read the doc

- Read its Decisions table, Principles, Status and the *Builds on* links.
- For each Decision, list the nouns that could appear elsewhere:
  - file, component and token names;
  - copy strings and numbers;
  - every rejected option;
  - the words "step N" and milestone numbers.

## 2. Search

Grep each noun (never read generated files whole) in:
- `docs/**/*.md`, including `docs/wireframes/`;
- `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`;
- `.claude/rules/`;
- code comments in the folders the doc touches.

A rejected option written as the current rule elsewhere is a conflict. So is a rule the doc replaces, a number it changes and a string it rewords.

## 3. Three named checks

- **Ownership clash:** two docs both mark the same work **Next**, or both claim one step.
- **Stale open item:** a Status tick that another doc still lists as open.
- **Missing link:** the doc has no entry in CLAUDE.md's *Design docs* list.

## 4. Report

Bullets and one table, at most ~350 words. Columns: file:line as a link, what it says now (12 words at most), the Decision or Principle it conflicts with, the edit proposed, and the kind:
- *Status/plan text*: the edit may be made without asking.
- *Decision row*: propose the row text in chat and wait for the owner's OK (CLAUDE.md, *When to stop and ask*).

Mark with **(same commit)** each edit the doc's own commit must carry, because docs change in the same commit as the code they describe.

| Where | Says now | Conflicts with | Edit | Kind |
|---|---|---|---|---|
| [web.md:72](../../../docs/web.md) | "Inter is the one font" | course-page Decision: DM Sans and Playfair replace Inter | New row naming both fonts **(same commit)** | Decision row |
| [payments.md:41](../../../docs/payments.md) | Step 6 marked **Next** | course-page owns the buy panel (steps 2 to 10) | Point step 6 to course-page; drop **Next** | Status/plan text |
| [courses.md:93](../../../docs/courses.md) | Course page capped at about 800 px (row at line 133: image `alt=""`) | Wireframe note 23 alt text; 7-column layout (680 px) | Align the note with `alt=""`; widen the cap text | Decision row |

When nothing conflicts, write "no conflicts found" and list the nouns searched.

## 5. After the report

- Edit nothing until the owner asks.
- Then apply only the *Status/plan text* edits and propose the *Decision row* texts in chat.
- `/plan-create-overview` runs this at step 5 (on the draft) and again before the hand-off in step 7.
