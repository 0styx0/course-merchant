# Milestone format

Written by `/plan-create-overview`, read by `/plan-create-implementation` in its first steps. The Status line stays one line so the plan pass can replace it with commit lines. Everything else sits in the milestone's `## Step N.` section, which the plan pass extends. A reader should not need chat history.

```
- [ ] **2. Unused-code check.** <Outcome in plain words.> **Next**

## Step 2. Unused-code check

- Why here: <the dependency or risk that puts it in this place>
- Needs: <earlier milestone numbers, or none>
- Builds on: <links to existing code, docs, rules and Decisions it touches>
- Size: <2 to 5 commits (rule in commit-size.md), plus a granularity hint such as "moves grouped per package"; based on the grep of touched files and twin code, not a feeling>
- Risk: <the unknown to retire, or none>
- Done when: <what to run or look at to prove the whole milestone>
- Blocks the split: <questions that change the order or size of the commits; settled at plan time through the picker>
- Can wait: <questions one commit can decide alone>
- Re-measure: <commands for facts that change; no typed counts>
```

- The outcome says what the admin, customer or developer can now do, in plain words, with no function, type or file names.
- Number only: 1, 2, 3. The plan pass labels commits 2a, 2b, matching [commit-line.md](commit-line.md): a number and one letter, never a deeper level. No other scheme.
- Fields by place: the **Next** milestone has every field. Any other milestone has only *Why here*, *Needs*, *Size*, *Risk* and *Done when*; the plan pass adds the rest when it becomes **Next**, so notes are not written for work that may change.
- **Spike:** a milestone flagged `*(spike)*` answers one question with throwaway code. Its section has *Question*, *Time-box* (hours, or one commit) and *Done when* = the written answer. No tests are required. It ends with a decision row recording the answer and what was rejected. Use one for any question only running code can answer (a library's real behaviour, a data shape, speed), and put it first.
- Exactly one milestone is **Next**. Omit a field that is empty, except *Done when* and *Needs*.
- *Done when* is the milestone-level check; each commit line's own *Done when* adds up to it. A UI milestone's ends with a journey: the steps the owner walks in `dev:mock`, with the screen expected at each step.
- A milestone that only restructures code names, in *Why here*, the feature milestone it unlocks.
- A count may appear only in a *Numbers* row with its date and command. Elsewhere use *Re-measure*.
- The plan pass keeps *Done when* and *Builds on* and answers *Blocks the split*. Its design notes are marked *(temporary)* and `/next-commit` cuts them when the step ships; a lasting choice is a Decision row from the start, never both.
- *Retro:* when the milestone's last commit ships, `/next-commit` adds three lines to the Step section: planned commits against real commits; what the owner changed after using the page; which rule caused friction. About once a month, `/usage-review` or the owner folds repeated patterns back into these skills.
