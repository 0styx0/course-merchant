# Future milestones

Cases the launch (MVP) accepts and leaves unbuilt. Each entry says what goes wrong, how likely it is, what a fix would cost, and what triggers building it. Read it when a design doc says "accepted as rare" and you need the full picture.

Add an entry when a review or a decision accepts a known gap. Remove it when the fix ships.

## Status

- [ ] **Deleting a course while a buyer is mid-checkout.**
- [ ] **Newsletter signup.**

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

### Newsletter signup

- **What goes wrong:**
  - The planned homepage and course list end with a band ("Stay close to the practice") that collects an email address.
  - The API has no endpoint that stores such an address, so a built band would accept an address and lose it.
- **How likely:** certain if the band ships.
- **Today's handling:** the launch pages leave the band out.
- **Options:**
  - Link the band to an outside newsletter service's hosted form. It costs almost no code and stores no address here; the visitor leaves the site to sign up.
  - Store addresses in our own database. It costs an endpoint, a table, a record of consent, an unsubscribe link and a way to send the mail (the email outbox could carry it).
- **Build it when:** the owner has news to send on a regular schedule.
- **Where it matters:** the planned homepage and course list designs.
