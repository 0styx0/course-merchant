# Milestone checklist

Used in steps 4 and 5 of [SKILL.md](SKILL.md). The format is in [../_shared/milestone-line.md](../_shared/milestone-line.md); the size rule is in [../_shared/commit-size.md](../_shared/commit-size.md). Answer each item for the draft map, fix the map, and record only what the next pass needs. This file is both how to cut the area and the check to run before presenting.

## Choosing milestones

- **Coverage:** is every must-have delivered by a named milestone? Is every milestone needed by a must-have or nice-to-have (otherwise drop it or move it to out of scope)?
- **Journeys:** does each user journey from the brief work end to end after some named milestone? Say which.
- **Outcome:** can the owner see or test each milestone alone, stated first in plain words ("the admin can save a course from the form")? A layer ("the database part") is not an outcome. If the title needs "and", or two parts could ship alone, split it.
- **Refactors:** a milestone that only restructures code is allowed only when its *Why here* names the feature milestone it unlocks. Otherwise make it the first commit of that feature milestone.
- **Slice:** milestone 1 is the thinnest path through every layer the area needs (a walking skeleton: ugly is fine, but it runs end to end). A later milestone that ships only a layer must name the milestone that makes it reachable; otherwise rewrite it.
- **Order:** list what each milestone needs. Order by dependency, then risk. A milestone others need goes first; the biggest unknown goes first, as a spike, small and on its own, with a *Done when* that proves or kills the idea.
- **Fix before enforce:** a milestone that turns on a check comes after the one that fixes what the check would reject.
- **Same-kind changes stay together** (all moves, all lint fixes in one package), as `/plan-create-implementation` groups them. Do not make one milestone per folder or per file.
- **Chores that touch unrelated places** (memory, skills, CLAUDE.md edits) are not a milestone together; attach each to the milestone it belongs to, or drop it.

## Checking the draft

- **Principles:** read each Principle against each milestone, and against every case it governs (a form-wide rule against every input kind: "check on blur" suits typed fields, not pickers). Does any milestone, as written, break one? Reorder or rewrite it. If the principle is wrong, ask the owner; do not let the plan quietly reverse it.
- **Scope of rules:** for every rule or policy, what does it cover and exempt? Which exemption, if reversed, adds work to a milestone? If one would, settle it now.
- **Libraries:** did the [library check](library-check.md) run for every milestone that would hand-roll logic? A milestone that rebuilds what a reliable library does is a candidate to shrink or drop.
- **Risk:** what is the least known part (library behaviour, unclear data, a tool's false alarms)? If only running code can answer it, make it a spike (see milestone-line.md), first.
- **Size:** write the range from the twin and touch list made in step 2, never from a feeling. Each milestone should split into 2 to 5 commits that each pass commit-size.md; one commit means merge it into a neighbour, more than five means cut it. Say the range and a granularity hint in *Size*; never file counts. Do not name the commits.
- **Existing code and rules:** for each milestone, what does it build on (grep)? Does an existing rule, doc or Decision conflict with it? A conflict that changes the order or size *blocks the split*; settle it now.
- **Cost of being wrong:** which choices are expensive to reverse (data model, public shapes)? Settle those now, even if they feel like detail.
- **Open questions:** each is tagged *blocks the split* or *can wait*, under the milestone that needs it. Tag by the test in milestone-line.md: does the answer change the list of commits? "Decided in a later pass" is not an answer for a question that passes the test.
- **Test data:** for an area with states, every state a milestone builds names its fixture and its mock handler, and the commit that creates each one that does not exist. Grep `web/src/mocks/` first. A fixture that is already wrong today (a sample course whose dates have passed) gets a commit that fixes it, before any milestone that walks it.
- **Skeleton placement:** the first UI of an area says where it sits on the page and which later milestone moves it. A milestone that builds a form before the layout exists draws the form under today's page, and the layout milestone moves it.
- **Copy:** every new screen has its words in the doc, or names the pass that sets them and the rule that pass follows (the style guide section). Error and empty-state words count.
- **State coverage:** for an area built from a wireframe, list every state and variant the wireframe draws, and name the milestone that builds each. A state with no milestone is a gap. Put the list in the doc as a table.
- **Self-contained doc:** the doc links no file outside the repo, defines every term a newcomer would not know (twin code, journey, `§` numbers, state labels), and names the command for every check it asks for.
- **Principle wording:** read each Principle against each state it governs, especially words like "after load", "never" and "only". A state whose behaviour the wording contradicts gets the wording fixed.
- **Docs touched:** run `/plan-ripple` on the draft. Every older doc row, Status line or wireframe note that a new Decision contradicts goes into the map as an edit, with its owner.
- **Facts checked:** each claim about the existing code or docs that the map relies on ("admin login has no web form", "cards show no image") has the file or grep that shows it. A claim written from memory gets checked or removed.
- **Done when is something to run or look at** (a command's output, a page, a test list). "Reviewed" is not a check.
  - A UI milestone's *Done when* ends with a **journey**: the steps the owner walks in `dev:mock`, with the screen expected at each step. A browser test of that journey proves it.
  - The owner's findings go into the milestone's last commit, or one follow-up commit, before the next milestone starts, so they don't pile up into a separate UX pass.
- **Facts are re-measured, not frozen.** Write `Re-measure: <command>`. A count appears only inside a *Numbers* row with its date and command.
- **Status lines** follow [milestone-line.md](../_shared/milestone-line.md); the lint hook (`.claude/hooks/lint-design-doc.sh`) warns when one holds backticks.

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
