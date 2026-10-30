# Definition of done

One list, used by `/next-commit` (step 4) and the hand-off. A commit is done when every item that applies is true. Per-commit *Done when* lines add to this list; they never replace it.

- Lint, type check and the tests for the touched code pass (commands in [project.md](project.md)).
- Generated code is regenerated from its source, never hand-edited.
- Every behaviour in the approved test table has a test that fails without the change.
- Every folder touched is within the files-per-folder limit.
- The design doc is updated in the same change: item ticked, next item **Next**, decision rows, *Changes* log if the plan moved.
- **Ran it**:
  - API commits: start the app or the browser test, do the behaviour once, and write one line of what you saw (`Ran it: created a course in the form, saw it on /`).
  - UI commits: drive the page in Chrome with the browser tools through the UI states the commit touches (the plan's *UI states* answers). Check that nothing moves or resizes unexpectedly. Record a GIF and name its file in the hand-off.
  - A commit that can't be run says why.
- Reviews done as `/next-commit` step 3 says, and each finding fixed or rejected with a reason.
- Nothing in the diff the outline didn't name; anything that differed is in *Deviations* in the hand-off.
