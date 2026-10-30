# Is this commit small enough?

One rule, used by `/plan-create-implementation` (when splitting a milestone) and `/next-commit` (before outlining). A **mechanical** commit (moves, renames, same-content splits, lint fixes) is measured by kind, not file count: one kind of change in one package passes even with more than 6 files, because reviewing it means checking that the diff shows renames and the test count is unchanged.

Any other commit is too big if any of these is true:

- More than about 6 files change (not counting generated files and doc ticks).
- It spans two separate areas of the codebase (for example `api/` and `web/`).
- Its one-line description needs "and" to join unrelated parts.
- More than 2 design questions are still undecided.
- It adds files to a folder that would pass the files-per-folder limit in CLAUDE.md and its line has no grouping.

Planner: split the commit until none holds. Builder: say which condition holds and the file count, then invoke the `plan-create-implementation` skill (Skill tool, with `$module` as the argument) to split the item. Do not outline or code a commit that fails the check.
