# Writing milestones

Used in step 4 of [SKILL.md](SKILL.md). The format itself is in [../_shared/milestone-line.md](../_shared/milestone-line.md); this file is how to cut the area.

- **One outcome per milestone,** visible to the owner or testable, stated first in plain words ("the admin can save a course from the form"). If the title needs "and", or two parts could ship alone, split it.
- **Equal weight.** Each milestone should split into 2 to 5 commits under [../_shared/commit-size.md](../_shared/commit-size.md). One commit: merge it into a neighbour. More than 5: cut it. Say the range in *Size*; never file counts.
- **Order by dependency, then risk.** A milestone that others need goes first; the biggest unknown goes first, as a spike (see the shared milestone format), small and on its own, with a *Done when* that proves or kills the idea.
- **Same-kind changes stay together** (all moves, all lint fixes in one package), as `/plan-create-implementation` groups them. Do not make one milestone per folder or per file.
- **Fix before enforce.** Any milestone that turns on a check comes after the one that fixes what the check would reject.
- **Chores that touch unrelated places** (memory, skills, CLAUDE.md edits) are not a milestone together; attach each to the milestone it belongs to, or drop it.
- **Each milestone's *Done when* is something to run or look at** (a command's output, a page, a test list). "Reviewed" is not a check.
- **Facts are re-measured, not frozen.** Write `Re-measure: <command>`. A count appears only inside a *Numbers* row with its date and command.

## Example (from the guardrails area, as it should have been written)

```
- [ ] **4. Folder layout fixed.** Every folder has at most 10 files, grouped by job. **Next**
- [ ] **5. Naming and layout rules written.** CLAUDE.md states the rules lint cannot check.
```

```
## Step 4. Folder layout fixed

- Why here: rules land only after the code passes them (Principle *Fix first, then enforce*), so this comes before milestone 5.
- Needs: none.
- Builds on: [CLAUDE.md](../CLAUDE.md) *Conventions*; `payments/` split as the model.
- Size: 3 commits (moves grouped per package; rows are by kind, not by folder).
- Risk: grouping by job is a judgement call per folder; the owner approves each tree.
- Done when: the folder-count command prints nothing; type check and the full test suite pass; test count unchanged.
- Blocks the split: does `api/src/courses/test/unit` follow the source sub-folders? It conflicts with [api-tests.md](../.claude/rules/api-tests.md).
- Can wait: names of the new folders.
- Re-measure: the folder-count command in *Numbers*.
```
