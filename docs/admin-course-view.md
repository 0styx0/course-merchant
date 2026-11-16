# Admin course view

Read this before working on the admin page for one course: its course details, its Students list, Un-enroll and Copy addresses. It records what the code can't tell you: progress, intent and why. It relates to [courses.md](courses.md) (admin course answers), [payments/refunds.md](payments/refunds.md) (the API's un-enroll and `refundStatus`), [payments/email.md](payments/email.md) (email status), [course-edit.md](course-edit.md) (the edit page this one links to), [course-page.md](course-page.md) (the public layout it reuses) and [style-guide.md](style-guide.md). Run it with `/plan-create-implementation admin-course-view` (a skill that splits one milestone into commits), then `/next-commit admin-course-view` (a skill that builds one commit). The owner and the admin are the same person, the signed-in shop owner. "Step N" and "milestone N" name the same thing. The "admin course answer" is the API's reply to `GET /v1/admin/courses/{courseId}`, which carries the course and its students.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes the next one.

- [x] **1. The admin opens a course's admin page.** The course shows like the public page with an admin side panel, students are listed by name and email, and the edit page links to it.
  - [x] **1a.** Pages that show a course choose its image; the public course page stays the same.
  - [x] **1b.** The shop and admin pages use one check for "this course doesn't exist". *(mechanical)*
  - [x] **1c.** The admin opens a course's admin page from its edit page and sees the course and its students by name and email.
  - [x] **1d.** The edit page and the admin page share the status words, the price split and the "shown in shop" check; the edit page stays the same. *(mechanical)*
  - [x] **1e.** The admin sees the course's status, times, current and scheduled prices, private link and public page link in the side panel.
- [ ] **2. The admin can see when each student enrolled, which currency they paid in and which email failed.**
  - [x] **2a.** The admin course answers say when each student enrolled, which currency they paid in, and which email they got last or are missing.
  - [ ] **2b.** The admin sees the date each student enrolled beside their name and email. **Next**
    - *Behaviours*:
      - Each line reads `Ada Lovelace · ada@example.com · enrolled Oct 16, 2026`.
      - The date reads in the course's time zone: `2026-10-17T02:00:00Z` in `America/New_York` reads Oct 16 (tests run in Pacific/Chatham, where it is Oct 17).
      - No students still reads "No students yet."
    - *New shared pieces*: none (reuses `dateOnlyFormatter` from [formatters.ts](../web/src/lib/utils/formatters.ts))
    - *Files*:
      - [student-list.tsx](../web/src/features/admin-courses/course-view/student-list.tsx) (takes the course's time zone)
      - [student-list.test.tsx](../web/src/features/admin-courses/course-view/student-list.test.tsx)
      - [page.tsx](../web/src/app/admin/(signed-in)/courses/[courseId]/page.tsx) (passes `course.schedule.timeZone`)
      - docs: this file's tick and Retro, [courses.md](courses.md) status line
    - *Settled*: the Decision row on student dates.
    - *Done when*: in `dev:mock` with `withEnrollment`, the list reads `Ada Lovelace · ada@example.com · enrolled Oct 16, 2026`.
- [ ] **3. The admin sees each student's enrollment, access, payment and problems.** A table on wide screens, cards on phones, coloured pills and Attention lines.
- [ ] **4. The admin un-enrolls a student.** A dialog confirms, then the row shows Un-enrolled and Refunded.
- [ ] **5. The admin sorts the students.** Needs attention first is the default.
- [ ] **6. The admin copies the addresses of every student with access.**

## Terms

- **Twin:** existing code that does a similar job, which a new piece shares or copies the shape of.
- **Journey (J1 to J4):** a one-sentence task the owner walks in `dev:mock` to prove a milestone.
- **Attention:** the column that lists what the owner must act on for a student.
- **Pill:** the rounded status label from [style-guide.md](style-guide.md) §7 *Badge and status pill*.
- **Active, Suspended, Un-enrolled:** access as [enrollment-access.ts](../api/src/enrollments/enrollment-access.ts) classifies it; a suspension outranks an un-enroll.
- **`dev:mock`:** `yarn --cwd web dev:mock`, the web app with canned API answers ([web.md](web.md)).
- **Re-measure:** a command that prints a fact that changes, so no count is typed into this doc.
- **§:** a numbered section of the file named beside it, such as [style-guide.md](style-guide.md) §7.
- **`/security-review`:** the repo's skill that reviews a commit's changes for security problems; payments work gets it on every commit.
- **Remembered course:** the mock's stored copy of one course ([remembered-course.ts](../web/src/mocks/handlers/admin-courses/remembered-course.ts)); edits update it, so the next load shows them.

## Journeys

- J1 Refund then un-enroll: the owner refunds Dana in Stripe, opens the page, clicks Un-enroll and confirms; Dana's row turns grey with Refunded and no button.
- J2 Spot Refund owed: the owner opens the page, Dana is on top with "Refund owed", and the owner refunds the extra payment in Stripe.
- J3 Follow up a failed email: Omar shows "Course access email failed"; the owner emails him the course link by hand.
- J4 Email everyone: the owner clicks "Copy addresses", sees "Copied 4 addresses" and pastes Omar, Dana, Noa and Sam into Bcc in their mail app.

The finished page, desktop, with one row for each case the data allows:

```
+----------------------------------------------------------------------------------+
| [ image 16:9, or the empty 16:9 box ]      | (Published) green                   |
| React Fundamentals (h1)                    | STARTS DEC 1, 2026                  |
| summary                                    | Tue, Dec 1, 6–8 PM EST · 2 hours    |
| description (public look)                  | $99 now · $129 from Nov 20          |
|                                            | Course link: zoom.us/j/… (private)  |
|                                            | [ Edit course ]  View public page ↗ |
+----------------------------------------------------------------------------------+
| Students (8)                        Sort by: [ Needs attention first ▾ ]         |
|                                     [ Copy addresses ]                           |
| Student          | Enrolled    | Access        | Paid   | Payment    | Attention                       |             |
| Dana Cohen       | Nov 2, 2026 | (Active)      | $99.00 | (Paid)     | ⚠ Already-enrolled email failed | [Un-enroll] |
|  dana@…          |             |               |        |            | ⚠ Refund owed                   |             |
| Omar Haddad      | Nov 4, 2026 | (Active)      | $99.00 | (Paid)     | ⚠ Course access email failed    | [Un-enroll] |
| Noa Levi         | Nov 7, 2026 | (Active)      | (Free) | —          | ⚠ Course access email failed    | [Un-enroll] |
| Lee Park         | Oct 30,2026 | (Suspended)   | $79.00 | (Paid)     | ⚠ Suspension email failed       | [Un-enroll] |
| Sam Ortiz        | Nov 9, 2026 | (Active)      | $99.00 | (Paid)     |                                 | [Un-enroll] |
| Rina Gold        | Oct 29,2026 | (Suspended)   | $79.00 | (Refunded) |                                 |             |
| Ari Stein        | Oct 28,2026 | (Un-enrolled) | $79.00 | (Refunded) |                                 |             |
| Ben Shaw         | Oct 27,2026 | (Un-enrolled) | (Free) | —          |                                 |             |
+----------------------------------------------------------------------------------+
Pills: Active and Paid are green; Suspended (with its date), Un-enrolled, Refunded, Pending and Expired are grey.
Empty: "No students yet." and Copy addresses disabled.
Phone: the panel sits under the summary; each student is a card with the fields in column order.
```

Pill rules: Active comes from a null `revokedAt` and `suspendedAt`; Suspended shows `suspendedAt` as a date in the [style-guide.md](style-guide.md) §8 format; Paid is a `succeeded` payment. A free course keeps the existing Free pill (`--secondary`) under Paid and shows "—" under Payment. Pending and Expired never reach an enrollment today; they take the grey pill with their own word.

Where each wireframe state is built:

| State | Milestone |
|---|---|
| Image or the empty 16:9 box, side panel, Edit and View public page links | 1 |
| Empty list, "No students yet." | 1 |
| One row of name and email, enrolled date | 1, 2 |
| Table, cards, pills, Attention lines, Refund owed | 3 |
| Un-enroll button and dialog | 4 |
| Sort menu | 5 |
| Copy addresses, and its disabled state when no student has access | 6 |

## Mocks and commands

- To choose a scenario for `dev:mock`, edit the `scenario` constant in [server.ts](../web/src/mocks/server.ts); an endpoint without that scenario serves its `success`.
- Existing admin-get scenarios in [get-course-as-admin.ts](../web/src/mocks/handlers/admin-courses/get-course-as-admin.ts): `success` (no students), `withEnrollment` (one), `notFound`, `invalidId`, `error`.
- Milestone 1 added `published`, a published course with a price in effect; every other fixture is a draft, so none shows the Published pill or the public link.
- Milestone 3 adds `withEveryStudentCase` (the eight rows above); milestone 4 adds `revokeEnrollmentHandlers`.
- Check a commit with `yarn --cwd web check:changed` (or `api`).

## Principles

- **The owner sees the course as buyers do.** The page reuses the public course layout, so the two stay in step.
- **Phones come first.** Below `md` each student is a card; the table appears from `md`.
- **Pills show state; Attention shows what to do.** Red text with an icon is only for things the owner must act on.
- **The page shows the API's words on failure.** An un-enroll error shows the API's message, never a fixed replacement ([web.md](web.md)).
- **No new API for sorting or copying.** The answer already holds every student, so the browser does both.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| The admin course view is `/admin/courses/[courseId]` and reuses the public course layout; the caller passes the image element | The owner sees the course as buyers do, and one layout stays in step with the public page. The admin page draws the stored image from the admin image route with `next/image`'s `unoptimized`, because Next's optimizer forwards no cookies to the image it fetches ([image docs](../web/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md), under `src`). A course with no image shows the empty 16:9 box, as the public page does | A copy of the layout (two to keep in step); the public image route (404 for drafts); optimizing the admin route (breaks once login guards it; low); a NO IMAGE box (differs from the public page; low) |
| Students show as a table from `md` up and as one card per student below, sorted by one menu (revisit after use) | Phones come first. A card has no column header to click, so one menu works at every width | Clickable headers (two sort controls); a table that scrolls sideways on phones |
| One Attention column names each failed email by kind ("Course access email failed", "Already-enrolled email failed", "Suspension email failed") and "Refund owed"; pills show only state (revisit after use) | The owner sees what to fix and which email to resend, and red stays for problems. An email that was never queued reads as its kind failed ([payments/email.md](payments/email.md) `latestEmail` row), because the owner sends it by hand either way | An Email status column (repeats Attention); a generic "Email failed"; a separate "No email sent" line (same action for the owner, and the page shows no send error that would tell the two apart) |
| The admin course answer adds each student's enrolled time, payment currency and the latest email's kind | The page can't work these out: free students have no payment time, and the status alone doesn't say which email | A separate students endpoint (more contract for one page) |
| Sorting runs in the browser over the full answer | The answer already holds every student, so the contract stays as it is | API sort parameters (contract, tests and paging for small lists) |
| Un-enroll confirms in a dialog, like Delete | [style-guide.md](style-guide.md) §7 *Button* keeps the destructive fill inside a confirm dialog, and [course-edit.md](course-edit.md) already rejected an inline confirm for Delete; the twin exists | An inline confirm in the row |
| "Copy addresses" copies the active students' email addresses, comma-separated, to the clipboard | One way that works with any mail app and any class size; no outbox kind, template or sender | A `mailto:` link with Bcc (some mail apps cut long links, so it needs a fallback anyway); server-sent bulk email (a new email kind, template and limits) |
| The page uses the public 1200px frame; a table too wide for the screen scrolls inside its own box | One frame keeps the course block the same on both pages, and the page never scrolls sideways (revisit after use) | The edit page's 672px column (too narrow for seven columns); a wider admin frame (a second frame to keep in step) |
| The contract calls the enrollment's `purchasedAt` `enrolledAt` | Free students enroll without buying, and the page's column reads "Enrolled" | Renaming the column (a migration for one word; low); `purchasedAt` in the contract (wrong for free courses) |
| Student dates on the admin page read in the course's time zone and en-US, like the side panel's times (revisit after use) | One page shows one zone, and the panel already says "Times in <zone>"; a server-rendered page has no visitor zone | The visitor's zone (client rendering for a date; medium); the request locale (the page would mix two date styles; low) |
| Active and Paid pills are `--success`; every other access and payment pill is `--muted`; no new token | Nothing sets a suspension any more ([payments/refunds.md](payments/refunds.md) row on `suspendedAt`) and Pending can't belong to an enrollment, so a warning colour would show only for old rows. Red stays for Attention | A new `--warning` token for Suspended and Pending (a token and contrast checks for states only old data reaches); red for Suspended (clashes with errors) |

## Step 1. The admin opens a course's admin page

- Why here: the thinnest path through the route, the admin loader and the shared course layout; every later milestone fills in this page.
- Needs: none.
- Builds on: [the edit page](../web/src/app/admin/(signed-in)/courses/[courseId]/edit/page.tsx) (loader, 404 and `ProblemAlert` handling), [course-page-layout.tsx](../web/src/features/courses/course-page-layout.tsx) (layout twin), [the admin image route](../web/src/app/admin/(signed-in)/courses/[courseId]/image/route.ts) (serves drafts' images too), [edit-page-header.tsx](../web/src/features/admin-courses/edit-course/header/edit-page-header.tsx) (gets the "View course" link, and `isShownInShop` decides the public page link), [get-course-as-admin.ts](../web/src/mocks/handlers/admin-courses/get-course-as-admin.ts).
- **Sketch** (desktop; on phones the panel sits under the summary): the top half of the whole-page sketch; Students is a plain list, `Ada Lovelace · ada@example.com`, or "No students yet."

```
+-------------------------------------------+----------------------------------+
| [ image 16:9, or the empty 16:9 box ]     | (Drafted)                        |
| React Fundamentals (h1)                   | times in the course's zone       |
| summary                                   | price now · scheduled prices     |
| description                               | Course link: https://…           |
|                                           | Edit course   View public page ↗ |
+-------------------------------------------+----------------------------------+
| Students                                                                     |
| Ada Lovelace · ada@example.com          (or "No students yet.")              |
+------------------------------------------------------------------------------+
```

- Where it lives: the route file is `web/src/app/admin/(signed-in)/courses/[courseId]/page.tsx`, beside the edit page's folder; the panel and the student list go in a new folder, `web/src/features/admin-courses/course-view/`.
- Side panel fields: status pill, start and end time, the price in effect and any scheduled price, the private course link, an Edit course link, and a "View public page" link. The words of each stay open (*Can wait*).
- Page width: the public frame, 1200px at most with 48px side padding from `md` ([page-frame-classes.ts](../web/src/features/site-layout/page-frame-classes.ts)). The width is only a ceiling, so a phone gets the screen's width. The page never scrolls sideways; a table that is too wide scrolls inside its own box (step 3).
- Size: 5 commits (the overview guessed 3 to 4): two mechanical sharing commits (1a, 1d) sit right before the commits that need them, and the shop and admin pages share one missing-course check (1b).
- Test data: existing `success` (no students), `withEnrollment` (one), `notFound`, `error`; new `published` (commit 1e).
- Done when: in `dev:mock` with `withEnrollment`, the edit page's "View course" link opens the page with the course, the panel and Ada Lovelace listed; with `success`, the list reads "No students yet." A draft course shows its Drafted pill, and the "View public page" link shows only when `isShownInShop` is true (try `published`).
- Can wait: the panel's words.

- *Retro*:
  - Planned 3 to 4 commits in the overview, then 5 in the plan; shipped 5 (1a to 1e).
  - The owner's changes after using the page: not yet recorded.
  - Rule friction: not yet recorded.

## Step 2. The admin course answer says when each student enrolled, in which currency they paid, and which email failed

- Why here: milestone 3's columns need these facts.
- Needs: 1.
- Builds on: [admin-courses.repository.ts](../api/src/courses/repositories/admin-courses.repository.ts) (the enrollment include), [enrollments.repository.ts](../api/src/enrollments/enrollments.repository.ts) (`purchasedAt` resets on a rebuy), [courses.mapper.ts](../api/src/courses/courses.mapper.ts) (`toAdminEnrollmentResponse`), `AdminEnrollment` in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml), [admin-courses.ts fixtures](../web/src/mocks/fixtures/admin-courses.ts).
- **Sketch:** milestone 1's list gains the enrolled date.
- Size: 2 commits, one per package; 2a also edits web's generated types and fixture data, because the pre-commit hook regenerates and type-checks web whenever the contract changes.
- Test data: 2a adds the new fields to the existing web fixtures.
- Done when: the API e2e test for admin get shows the three new facts; in `dev:mock` with `withEnrollment`, the plain list reads `Ada Lovelace · ada@example.com · enrolled Oct 16, 2026`.
- Contract names *(temporary)*: `enrolledAt` (top level of the enrollment), `payment.currency` (beside `amount`, a `$ref` to a new `CurrencyCode` schema that `Price.currency` shares), `latestEmail: { kind, status }` in place of `emailStatus`. All required, none nullable.
- Email kinds *(temporary)*: `latestEmail.kind` lists only the three outbox kinds; the missing-email rule always names one, so there is no `unknown`. A missing `already_owned` email can't be detected, because the enrollment looks the same whether or not it went.
- Repository *(temporary)*: `include("payment")` already loads every payment column and the enrollment's `purchasedAt`; only the email select gains `kind`, plus the model type.
- Web date *(temporary)*: `dateOnlyFormatter(courseTimeZone, "en-US")`; milestone 3's Suspended date reuses it.
- Example answer *(temporary)*, one enrollment per case (customer and payment shortened):

```json
[
  { "enrolledAt": "2026-10-16T10:00:00Z", "suspendedAt": null,
    "latestEmail": { "kind": "access_granted", "status": "sent" },
    "payment": { "status": "succeeded", "amount": 9900, "currency": "USD", "paidAt": "2026-10-16T10:00:00Z" } },
  { "enrolledAt": "2026-11-07T14:00:00Z", "suspendedAt": null,
    "latestEmail": { "kind": "access_granted", "status": "failed" },
    "payment": null },
  { "enrolledAt": "2026-10-30T09:00:00Z", "suspendedAt": "2026-11-02T12:00:00Z",
    "latestEmail": { "kind": "access_suspended", "status": "failed" },
    "payment": { "status": "succeeded", "amount": 7900, "currency": "USD", "paidAt": "2026-10-30T09:00:00Z" } }
]
```

- Flow *(temporary)*:

```
Admin opens /admin/courses/{id}
└── web loads GET /v1/admin/courses/{id}                   existing (1c)
    └── API reads course with enrollments                  existing
        ├── enrollment's purchasedAt → enrolledAt           2a
        ├── payment row → payment.currency                  2a
        │   └── free course: payment null                   existing
        └── newest linked email → latestEmail {kind,status} 2a
            └── no email: status failed                     2a
                ├── suspended → kind access_suspended       2a
                └── otherwise → kind access_granted         2a
    └── student line: name · email · enrolled <date>       2b
        └── no students: "No students yet."                existing (1c)
```

- Failure table *(temporary)*:

| Actor | Failure | What the system does | Test |
|---|---|---|---|
| Checkout | Email cap skips a free grant's email | `access_granted`, `failed` | integration get |
| Fulfillment | Suspension email never queued | `access_suspended`, `failed` | mapper unit |
| Outbox | Newer email sent after a failure | newest kind and status | integration get |
| Customer | Rebuys after un-enroll | `enrolledAt` = rebuy time | enrollments repository (existing) |
| Anonymous caller | No session | 401 | route-protection e2e (existing) |

## Step 3. The admin sees each student's enrollment, access, payment and problems

- Why here: the table is the page's main job; sorting, Un-enroll and Copy addresses all work on its rows.
- Needs: 1, 2.
- Builds on: [style-guide.md](style-guide.md) §7 *Badge and status pill* (the existing `--success` and `--muted` pairs), [formatters.ts](../web/src/lib/utils/formatters.ts) (money), shadcn `Table` and `Badge` (copied in; no new dependency).
- **Sketch:** the whole-page Students table in the API's order, with no Sort menu, no Copy button and no Un-enroll buttons.
- Size: 3 to 4 commits: the words for each row (access, payment, attention) as pure functions, then the table, then the phone cards.
- Table width: the table sits in its own box with `overflow-x: auto`, so a table wider than the screen scrolls inside the box and the page keeps no sideways scroll.
- Attention skips un-enrolled rows: the API reads an un-enrolled student with no email as `{ access_granted, failed }` (the `latestEmail` rule), but the owner has nothing to resend to someone they removed.
- Test data: new `adminCourseWithEveryStudentCase` (the eight rows) and its `withEveryStudentCase` scenario, created by the first commit that needs them.
- Done when: in `dev:mock` with `withEveryStudentCase`, all eight rows match the sketch at desktop and phone width, and J3 is walked (Omar shows "Course access email failed").

## Step 4. The admin un-enrolls a student

- Why here: the page's one action that changes data, built after the rows it acts on.
- Needs: 3.
- Builds on: `revokeEnrollment` in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) (204, a repeat is also 204, 404 `ENROLLMENT_NOT_FOUND`), [delete-confirmation.tsx](../web/src/features/admin-courses/edit-course/status/delete-confirmation.tsx) (dialog twin), the edit save's `refresh()` (the row in [course-edit.md](course-edit.md) that starts "After a save, the details action calls Next's `refresh()`"), the remembered course ([remembered-course.ts](../web/src/mocks/handlers/admin-courses/remembered-course.ts)).
- **Sketch:** milestone 3 plus an `[Un-enroll]` button per row and its dialog.
- Size: 3 to 4 commits: the API wrapper, action and mock handler, then the dialog and button, then a browser test of J1.
- Risk: a payments area, so `/security-review` on each commit.
- Test data: new `revokeEnrollmentHandlers` (`success`, `notFound`, `error`) that update the remembered course, so the row changes after the refresh.
- Done when: J1 walked in `dev:mock`; a failed call shows the API's message in the dialog.
- Can wait: the dialog's words; whether Rina's row (suspended and already un-enrolled) shows the button.

## Step 5. The admin sorts the students

- Why here: sorting needs the columns it orders by.
- Needs: 3.
- Builds on: milestone 3's row functions.
- **Sketch:** milestone 4 plus the Sort menu: newest or oldest enrolled, active first, needs attention first (default).
- Size: 2 commits: the three orderings as pure functions, then the menu.
- Done when: J2 walked (with "Needs attention first", Dana sorts to the top); each sort orders the eight-row fixture as the whole-page sketch shows.

## Step 6. The admin copies the addresses of every student with access

- Why here: it needs milestone 3's access words and nothing from 4 or 5.
- Needs: 3.
- Builds on: milestone 3's access function; the browser's [Clipboard API `writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) (needs HTTPS or localhost and a click; both hold here).
- **Sketch:** the whole-page sketch.
- Size: 2 commits: the address list, then the button with its "Copied 4 addresses" note and disabled state.
- Done when: J4 walked; the clipboard holds exactly the active students' addresses.
- Can wait: what shows if the browser refuses the copy.

## Open questions

- Milestone 1, can wait: the panel's words.
- Milestone 4, can wait: the dialog's words; Rina's row.
- Milestone 6, can wait: what shows if the browser refuses the copy.

## Out of scope

- Lifting a suspension.
- The admin login form.
- The admin course list, built after this area; it links here and to the edit page.
- Server-sent bulk email and a `mailto:` link.
- A `--warning` colour token; it waits for its first reachable use.
- Pending and Expired payments on enrollments (the API grants access only after a payment succeeds); they get colours only.
