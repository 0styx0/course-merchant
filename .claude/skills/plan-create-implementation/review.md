# Plan review

Used in step 6 of [SKILL.md](SKILL.md).

## Self-check (always)

For each commit line:
- Run the size check. Does it pass?
- Could `/next-commit` write the test table (happy, failure, edge) from the line and the doc alone?
- Is every decision it depends on a decision row or an answered question?
- Are its files and the folder counts right (re-grep, do not trust memory)?
- Is its mechanical flag right? Would it still be right if a test were missing?
- Does the order hold if one commit is delayed?

Across the plan:
- Does the sum of commits deliver the milestone, and nothing else?
- Does any commit leave unused code until a later one?

## Subagent review (when the milestone has more than 3 commits, adds a decision row, or changes the contract or database schema)

Give a subagent (Sonnet at high effort: the Agent tool's `model` and `effort` options) only the plan and the files it names. Ask for at most 5 problems in 250 words total, in these areas: module boundaries, missed reuse, order and hidden coupling, missing failure cases, and size. For a contract or schema change, keep the reviewer on Sonnet at high effort: it is already a different model from yours (this skill runs on Opus). Report which you accept and fix, and which you reject with a reason. Do not relay the full list.
