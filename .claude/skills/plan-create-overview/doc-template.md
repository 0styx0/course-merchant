# Doc template

Used in step 7 of [SKILL.md](SKILL.md). Match [auth.md](../../../docs/auth.md). Never copy schemas or contract shapes into the doc.

```
# <Area title>

Read this before <work in this area>. It records what the code can't tell you: progress, intent, why. <Which docs it relates to.> Run it with `/plan-create-implementation <area>`, then `/next-commit <area>`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes **Next**.

<one Status line per milestone, format in _shared/milestone-line.md>

## Principles
## Numbers        (only when there are limits or measurements: rule | value | source | command that measures it)
## Decisions      (| Decision | Why | Rejected |)
## Step N. <milestone>   (one per milestone: the fields in _shared/milestone-line.md, in that order)
## Open questions   (only questions with no milestone yet; others live in their Step)
## Out of scope
```
