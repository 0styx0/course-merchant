# Presenting the plan

Used in step 7 of [SKILL.md](SKILL.md). Bullets only, at most ~600 words, in this order so the owner can stop after the second section:

1. **Summary:** what the milestone delivers, the commit count and granularity, what changed from the overview.
2. **Questions for you:** anything open (usually none).
3. **Commits:** the lines in the format of [../_shared/commit-line.md](../_shared/commit-line.md), with one nested bullet per file and per behaviour.
4. **Page sketch**, for a milestone that adds or reorders a page, section or field: an ASCII wireframe in one code block with the sections in order (titles and help text), the fields in order, and what shows while the page is empty. The owner approves it with the plan.
5. **Design notes:** bullets by topic, from step 4.
6. **Proposed decision rows:** the exact `| Decision | Why | Rejected |` text. For each rejected option: what it would give, what it would cost, and its complexity. Only strong contenders. A row deciding what shows, where, or in what order on a page ends its *Why* with "(revisit after use)": changing it after the owner tries the page is expected, not a reversal.
7. **Review result:** one line per accepted or rejected finding.
8. **Terms:** only those the owner may not know.
