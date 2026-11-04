---
name: plan-cold-read
description: Have a fresh subagent read a design doc as a developer on day one and report what would stop them from starting the first milestone. Run at the end of /plan-create-overview (before the hand-off) and after /plan-create-implementation, or when the owner asks for a cold read of a doc.
argument-hint: "<doc path or area>"
arguments: [doc]
---

# Plan cold read

Doc: `$doc`. A "cold read" means a reader with no project history opens only the doc and its links. The `plan-reviewer` agent checks a plan against the skill rules and once passed a plan in which a newcomer found about 25 gaps, so this pass checks what the doc says to a stranger.

Read [../_shared/chat-rules.md](../_shared/chat-rules.md) first. Follow CLAUDE.md's *Writing* rules throughout.

## 1. Resolve the doc

- A path that exists is the doc.
- An area name `<area>` means `docs/<area>.md`.
- When the file is missing, say so in one plain sentence and stop.

## 2. Send the reader

- Call the Agent tool with `subagent_type: Plan`, because that agent has no edit tools.
- The prompt is the full text of [reader-prompt.md](reader-prompt.md), then the doc path on its own line. Add nothing else: no summary of the doc, no history, no hints. Any extra context makes the reader less cold.

## 3. Sort the findings

Restate each finding in your own words and define any term the reader used (CLAUDE.md *Relaying a subagent*). Do not paste its list. Put each finding in one group:

- **Fix now:** the repo already settles the answer and the doc lacks it, such as a missing link, an undefined term, a path outside the repo or a missing command.
- **Owner decides:** the fix is a design or behaviour choice. Propose a default. When there are several options, run the `decision-card` skill, one decision at a time.
- **Reject:** the finding is wrong or out of scope. Give the reason.

## 4. Edit nothing

- Offer the Fix now edits as one bullet each and wait for the owner's OK.
- A Decision-row change always needs the owner's OK (CLAUDE.md *When to stop and ask*).

## 5. Reply

Bullets only, at most ~300 words. Order: Fix now, Owner decides, Reject. Start with one bullet saying how many findings the reader made and how many you kept.
