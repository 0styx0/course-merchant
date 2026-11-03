---
name: usage-review
description: Review how the owner uses Claude on this repo, measured from session transcripts, and give a few ranked tips. Use about once a month, or when the owner asks about usage or token cost.
---

# Usage review

Compare against the previous review in the memory file `usage-reviews.md` (the owner's auto-memory folder; the index line is in `MEMORY.md`). Re-measure the same fields; don't trust old numbers.

## 1. Measure

- Run `bash .claude/skills/usage-review/measure.sh <after>` with the previous review's "next review starts after" time. It prints calls (main and subagent), owner turns, re-read, cache-write and output tokens, re-read per call, each session's first and last context size, sessions ending above 100k, and subagent cost by kind. Transcript times are UTC. A change to the script needs a test in `measure.test.sh` first.
- By hand, from the script's output and `git log`: about how many commits, per-commit calls and re-read, outliers and why, and quality (outline approved first time or not, correction rounds, questions asked).

## 2. Report

- Never give raw token counts alone. Translate them: "each call cost as much as N first messages of a fresh session (~43k)", or how long the weekly allowance would last. Label estimates as estimates.
- Show the change against the previous review, and say which earlier tips were adopted. Don't repeat adopted ones.
- Give a few tips, most impactful first. Each has a before/after for efficiency (context tokens per call, calls per commit) and quality (correction rounds per commit); "before" is measured, anything else is labelled an estimate.

## 3. Save

Add a new dated section to `usage-reviews.md` with the same fields (don't overwrite earlier ones), update its "next review starts after" line, and keep the `MEMORY.md` index line.
