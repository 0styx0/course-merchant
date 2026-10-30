# Flow diagram

Used by `/next-commit` (outline and hand-off) and `/plan-create-implementation` (the presented plan). It shows what a user or a request goes through, not where code lives. File moves use the BEFORE/AFTER folder diagram in [output-format.md](output-format.md) instead.

## When to draw it

- Draw it when the work has logic: a path with a branch (invalid input, a failure, a throw, a success).
- Skip it for mechanical commits and doc-only changes.

## How to draw it

- One code block, steps top to bottom, branches split with `├──` and `└──`.
- Start at what the user or caller does ("Admin clicks Save changes"), not at a function.
- Mark every step at its right edge:
  - `NEW` means written in this commit.
  - `existing (2c)` means reused, with the commit or file it came from.
  - `NEW wiring` means a new call of an existing piece; name the piece.
- Every branch ends with what it leaves behind:
  - the message shown,
  - the state kept (form values, draft id, leave warning),
  - whether a request was sent.
- Add two bullet lists after the block: *What the commit adds* and *What it reuses*.

## In the plan (milestone)

- Draw the whole milestone's flow once.
- Replace `NEW` with the commit line that builds the step (`2d`, `2e`).
- Check two things before presenting:
  - every branch has a commit that builds it,
  - no step is built by two commits.

## In the hand-off

- Draw the flow as built, not as outlined.
- Mark any step that differs from the outline `CHANGED`, with the reason.
