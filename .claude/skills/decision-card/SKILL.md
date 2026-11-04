---
name: decision-card
description: Present a choice the owner must make as one card per option (user experience before/after, code snippet, complexity estimate, rejection reason), then offer the pick through AskUserQuestion. Use when the owner must choose between options and the choice needs its experience, code and cost shown, from plain chat or from another skill (plan-create-overview, plan-create-implementation, next-commit), or when the owner asks for "before/after, code snippet and complexity" on an open question.
argument-hint: "<question>"
---

# Decision card

Question: `$ARGUMENTS`. If it is empty, ask which choice in plain chat and stop.

A **card** is a short write-up of one option. A **card set** is the cards for one question. The owner decides faster when each option shows what users see, what the code looks like and what it costs.

## 0. Read now

Read [../_shared/chat-rules.md](../_shared/chat-rules.md). This skill is the exception to its 150-word cap (see *Length*); its picker rule and its docs-link rule still apply.

## 1. Build the set

- Offer 2 to 4 options, mutually exclusive, for **one** question per set.
- Put the recommended option first. Its name ends in `(Recommended)`, and it carries the single most important reason.
- Define each specialized term the first time it appears (CLAUDE.md *Plain language*).
- Link the docs of every library you mention.

## 2. Card shape

Write each option in exactly this shape, as bullets:

- **Name** of the option (`(Recommended)` on the first).
- **Before / after for the user:** what the visitor, admin or developer sees today and after this option, in 1 to 2 bullets.
- **Code:** a before snippet and an after snippet, at most 8 lines each.
  - Grep the repo for every file, function and component name before you write it.
  - Write `name not found` where grep finds nothing; never invent a name.
- **Complexity:** lines and files to add, tests needed, new dependencies, and what becomes harder to change later.
  - Use ranges ("about 15 lines plus one test"), never a feeling ("small", "easy").
- **Rejected because:** one plain sentence on what goes wrong with this option.
- **Depends on:** name any other open question whose answer this option changes. Omit the bullet when none.

## 3. Length

- Open the set with one line that states the question.
- Keep each option within about 120 words, code snippets excluded.

## 4. Ask the pick

- Right after the cards, call AskUserQuestion with the same options: recommended first and labelled, one line of consequence each.
- When another skill called you, return the owner's pick to that skill and stop.

## 5. After the pick

- Record the pick where the caller says. A Decision row in `docs/` needs the owner's OK first: propose the row text in chat and wait.
- Do nothing else: no code edits, no other doc edits.

## Questions

When the owner asked a question and did not say "decide this", show the cards and stop after the picker. Offer any resulting change as an option; make no edits (CLAUDE.md *Questions aren't instructions*).
