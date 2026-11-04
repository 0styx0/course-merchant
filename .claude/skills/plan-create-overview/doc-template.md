# Doc template

Used in step 7 of [SKILL.md](SKILL.md). Match the model doc named in [../_shared/project.md](../_shared/project.md). Never copy schemas or contract shapes into the doc.

```
# <Area title>

Read this before <work in this area>. It records what the code can't tell you: progress, intent, why. <Which docs it relates to.> Run it with `/plan-create-implementation <area>`, then `/next-commit <area>`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes **Next**.

<one Status line per milestone, format in _shared/milestone-line.md>

## Terms          (every word a newcomer would not know: twin code, journey, walked, Re-measure, "§" and note references; one line each, with a link to where it is defined)
## Journeys        (areas with screens: the 2 to 3 one-sentence journeys, then the whole-page sketch in one code block; for a wireframe-driven area, also a table of each wireframe state or variant and the milestone that builds it)
## Mocks and commands   (areas with states: how the owner picks a mock scenario, the handler names, and the commands to walk and check)
## Principles
## Numbers        (only when there are limits or measurements: rule | value | source | command that measures it)
## Decisions      (| Decision | Why | Rejected |)
## Step N. <milestone>   (one per milestone, with its Sketch first for areas with screens; the Next one has every field in _shared/milestone-line.md, the others only Why here, Needs, Sketch, Test data, Size, Risk, Done when)
   Retro: (filled by /next-commit when the milestone's last commit ships; format in _shared/milestone-line.md)
## Changes       (| Date | What changed | Why |; only once the plan moves after approval: an order change, a milestone added or cut, a Principle changed. A milestone that needs more or fewer commits than its Size is normal and is not logged; the Retro records it.)
## Open questions   (only questions with no milestone yet; others live in their Step)
## Out of scope
```
