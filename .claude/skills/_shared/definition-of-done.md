# Definition of done

One list, used by `/next-commit` (*Verify*) and the hand-off. A commit is done when every item that applies is true. Per-commit *Done when* lines add to this list; they never replace it.

- Lint, type check and the tests for the touched code pass (commands in [project.md](project.md)).
- Every behaviour in the approved test table has a test that fails without the change.
- The design doc is updated in the same change: item ticked, next item **Next**, decision rows, *Changes* log if the plan moved.
- **Ran it**:
  - API commits: start the app or the browser test, do the behaviour once, and write one line of what you saw (`Ran it: created a course in the form, saw it on /`).
  - UI commits: drive the page in Chrome with the browser tools through the UI states the commit touches (the plan's *UI states* answers). Check that each error message or new piece of content appears in space kept for it, so no field or button below it shifts. Record a GIF and name its file in the hand-off.
  - The last commit of a UI milestone also walks the journey written in the milestone's *Done when*, step by step, and checks each expected screen.
  - A commit that can't be run says why.
- **Surface colours:** a commit that adds or first uses a shadcn component lists its `bg-*` classes (`bg-popover`, `bg-card`, `bg-muted`…) in the hand-off, and each matches the surface [style-guide.md](../../../docs/style-guide.md) gives that place, because shadcn's defaults paint white or cold grey where the shop is cream.
- Reviews done as `/next-commit` *Build* says, and each finding fixed or rejected with a reason.
- Nothing in the diff the outline didn't name; anything that differed is in *Deviations* in the hand-off.
