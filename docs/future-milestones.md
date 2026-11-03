# Future milestones

Cases the launch (MVP) accepts and leaves unbuilt. Each entry says what goes wrong, how likely it is, what a fix would cost, and what triggers building it. Read it when a design doc says "accepted as rare" and you need the full picture.

Add an entry when a review or a decision accepts a known gap. Remove it when the fix ships.

## Status

- [ ] **Deleting a course while a buyer is mid-checkout.**

## Entries

### Deleting a course while a buyer is mid-checkout

- **What goes wrong:**
  - A buyer opens a Stripe checkout, which stays open for 31 minutes (`CHECKOUT_EXPIRES_AFTER`).
  - The admin deletes the course, which has no enrollment yet, so the API allows it.
  - The buyer pays, and the webhook enrolls them in a deleted course. The admin list hides that course, and fulfillment never checks the course's status.
- **How likely:** rare. It needs a delete during the 31 minutes after a checkout opens, or a late Stripe webhook retry.
- **Today's handling:** the admin can set the status back from Deleted, which restores the course. The paid student keeps their enrollment.
- **Options:**
  - Count open checkouts in the delete rule. It closes the 31-minute window; it costs a rule that reads checkout state.
  - Check the course's status in fulfillment and flag the enrollment for the owner. It also covers late webhook retries; it costs a new owner-facing signal.
- **Build it when:** the shop sells enough that admins delete courses during sales, or one such enrollment happens.
- **Where it matters:** [courses.md](courses.md) *Editing a course*, and the Decision row on enrollments and deleting in [course-edit.md](course-edit.md).
