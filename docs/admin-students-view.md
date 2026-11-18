# Admin students view

Read this before working on the admin Students page. The page lists everyone the shop has an email for, copies the buyers' addresses for a mail app, and moves students between Subscribed and Unsubscribed. This doc records what the code can't tell you: progress, intent and why.

It relates to:
- [admin-course-view.md](admin-course-view.md), the course page whose copy button, access check and sort menu this page shares;
- [payments/refunds.md](payments/refunds.md), on un-enroll and suspension;
- [web.md](web.md), on the admin route layout;
- [style-guide.md](style-guide.md).

Run it with `/plan-create-implementation admin-students-view`, a skill that splits one milestone into commits. Then run `/next-commit admin-students-view`, a skill that builds one commit.

A few naming notes:
- The owner and the admin are the same person, the signed-in shop owner.
- "Step N" and "milestone N" name the same thing.
- The "course page" means the admin page for one course, `/admin/courses/[courseId]`.

Keep this file current **in the same commit as the work**: tick the step, and mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes the next one. Every milestone ships before launch.

- [x] **1a.** The API can read every customer with their latest checkout time and all their enrollments. Nothing serves it until 1c.
- [x] **1b.** The admin course answer turns stored enrollment times into API times with a helper in `enrollments/`, ready for the customer list in 1c.
- [x] **1c.** The admin's API answers `GET /v1/admin/customers` with every customer, their latest checkout time and their enrollments.
- [x] **1d.** The admin opens `/admin/students` and sees each student's name and email, "No students yet." when there are none, or the API's message when the load fails.
- [x] **1e.** The admin sees unfinished checkouts below the students, newest first, each dated in their browser's time zone, and a browser test checks the date follows that zone after hydration.
- [x] **2. The admin reaches Students and New course from an admin nav on every admin page.**
  - [x] **2a.** Developers find the site's header, footer and page-frame files in topic folders, so the new header files fit under the files-per-folder limit.
  - [x] **2b.** Every admin page shows a header with "Embodying Emptiness · Admin" as text, New course and Students links, and a Menu on phones.
  - [x] **2c.** Both headers mark the link to the page on screen with the style guide's gold current-page pill, on wide screens and in the phone menu.
- [ ] **3. The admin copies the addresses of every student in good standing, by button or by hand from a popup.** **Next**: still needs `/plan-create-implementation admin-students-view` to split it into commits.
- [ ] **4. The admin unsubscribes and resubscribes a student, and the copy leaves unsubscribed students out.**
- [ ] **5. The admin finds a student by typing part of their name or email.**
- [ ] **6. The admin sees each student's course count, last enrolled date and courses, newest first.**
- [ ] **7. The admin sorts both student lists by newest enrolled, most courses, name or good standing.**

## Terms

- **Customer:** anyone the shop has an email for, that is, every customer row.
- **Student:** a customer with at least one enrollment, including a suspended or un-enrolled one.
- **Unfinished checkout:** a customer with no enrollment, someone who started a checkout and never paid.
- **Subscribed, Unsubscribed:** whether the admin's bulk mail may include the student.
  - Only this page sets it.
  - Course emails and the course page's copy ignore it.
- **Suspended:** an enrollment with a suspension time set, from a past dispute ([payments/refunds.md](payments/refunds.md)).
- **Un-enrolled:** an enrollment the admin revoked on the course page.
- **In good standing:** a student none of whose enrollments is suspended or un-enrolled. A course that has ended doesn't matter.
- **Search:** the box that narrows what the lists show. It never changes what Copy takes.
- **Contract:** the API's OpenAPI file, [openapi-v1.yaml](../api/openapi/openapi-v1.yaml). The database schema is [contract.prisma](../api/src/prisma/contract.prisma), named in full where meant.
- **Twin:** existing code that does a similar job, which new code shares or copies the shape of.
- **Journey (J1 to J3):** a one-sentence task the owner walks in `dev:mock` to prove a milestone.
- **Walking skeleton:** the thinnest version that runs through every layer.
- **`dev:mock`:** `yarn --cwd web dev:mock`, the web app with canned API answers ([web.md](web.md)).
- **Remembered store:** a mock's stored copy of data that actions update, so the next load shows the change. [remembered-course.ts](../web/src/mocks/handlers/admin-courses/remembered-course.ts) is the twin.
- **Re-measure:** a command that prints a fact that changes, so no count is typed into this doc.
- **§:** a numbered section of the file named beside it, such as [style-guide.md](style-guide.md) §9.
- **low, medium, high:** after a rejected option in *Decisions*, the cost and complexity that option would have added.
- **(revisit after use):** the owner re-checks the decision once they have used the shipped page.

## Journeys

- J1 Announce a course: the admin clicks "Copy 2 addresses" and pastes into Bcc. Lee (suspended), Ben (un-enrolled), Dana (unsubscribed) and Tal (unfinished checkout) stay out.
- J2 Dana asks to stop: the admin types "dana" in the search box and clicks Unsubscribe. She moves to Unsubscribed, and the Copy button's count drops by one.
- J3 Dana asks back in: the admin searches for Dana and clicks Resubscribe. She returns to the main list, and the count rises by one.

The finished page, desktop:

```
+--------------------------------------------------------------------------+
| Embodying Emptiness · Admin                 New course  (Students)       |  admin nav
+--------------------------------------------------------------------------+
| Students (4)                       Sort by [ Newest enrolled first ▾ ]    |
| [ Search by name or email                                      ]         |
| [ Copy 2 addresses ]  Show addresses                                     |
| Copied 2 addresses. Paste them into Bcc, not To.                         |
| Student            Courses        Last enrolled                           |
| Sam Ortiz          3 ▸            Nov 9, 2026            [ Unsubscribe ]  |
|  sam@example.com   ▾ React Fundamentals · Nov 9, 2026                     |
|                      Intro to TypeScript · Oct 2, 2026                    |
|                      CSS Layout · Sep 1, 2026                             |
| Noa Levi           1              Nov 7, 2026            [ Unsubscribe ]  |
| Lee Park (Suspended) 1            Oct 30, 2026           [ Unsubscribe ]  |  not copied
| Ben Shaw (Un-enrolled) 1          Oct 27, 2026           [ Unsubscribe ]  |  not copied
+--------------------------------------------------------------------------+
| Unsubscribed (1)                                                         |
| Dana Cohen         2              Nov 2, 2026            [ Resubscribe ]  |
+--------------------------------------------------------------------------+
| Unfinished checkouts (1)                                                 |
| Started a checkout and never paid. Never copied.   (grey help)           |
| Tal Ben · tal@example.com · Nov 3, 2026                                  |
+--------------------------------------------------------------------------+
Copy: Sam, Noa (2), whatever the search shows or hides.
Sort menu: Newest enrolled first · Most courses first · Name A–Z · Good standing first; one order for Students and Unsubscribed. Unfinished checkouts list the newest checkout first, with its date.
Search: narrows all three lists; no match shows "No one matches “zzz”."
Empty: "No students yet.", with no Search, Sort menu, Copy button or Unsubscribed section; the Unfinished checkouts list still shows when it has anyone.
None to copy: "Copy 0 addresses" disabled, with Show addresses disabled and a "No students to copy." line.
Show addresses popup:
  +-----------------------------------------------+
  | Addresses to copy (2)                     [×] |
  | +-------------------------------------------+ |
  | | sam@example.com, noa@example.com          | |  read-only, all selected on open
  | +-------------------------------------------+ |
  | Copy them, then paste into Bcc, not To.       |
  |                                     [ Close ] |
  +-----------------------------------------------+
No one unsubscribed or no unfinished checkout: that section hides.
Phone: the nav folds into a menu; each row wraps into a stacked card; Search and Copy are full width under the heading.
```

The words in the sketch are drafts. Each milestone's plan pass sets them by [style-guide.md](style-guide.md) §9.

Where each sketched state is built:

| State | Milestone |
|---|---|
| Student list, Unfinished checkouts list, "No students yet.", API failure | 1 |
| Admin nav, wide and phone | 2 |
| Copy button with count, Bcc note, popup, disabled and refused states, "(Suspended)" and "(Un-enrolled)" labels | 3 |
| Unsubscribe, Resubscribe, Unsubscribed section | 4 |
| Search box, no-match line | 5 |
| Courses count, Last enrolled, course list | 6 |
| Sort menu | 7 |

## Mocks and commands

- To pick a scenario for `dev:mock`, edit the `scenario` constant in [server.ts](../web/src/mocks/server.ts). An endpoint with no such scenario serves its `success` answer. The constant applies to every endpoint at once, so `empty` also empties any other endpoint that has an `empty` scenario.
- Milestone 1 adds the list handler in a new `web/src/mocks/handlers/admin-students/` folder, named after its operationId. A new folder is needed because [handlers/admin-courses/](../web/src/mocks/handlers/admin-courses/) is near the 10-file limit (CLAUDE.md *Conventions*).
  - Its scenarios are `success`, `empty` and `error`.
  - `success` serves the six customers in the sketch, with Tal having no enrollment and Dana still subscribed.
  - Its fixture goes in a new `web/src/mocks/fixtures/admin-students.ts`.
- Milestone 4 does two things:
  - it marks Dana unsubscribed in that fixture;
  - it adds unsubscribe and resubscribe handlers that share a remembered store of the fixture.
- Check a commit with `yarn --cwd web check:changed` (or `api`).

## Principles

- **Phones come first.** Each row stacks into a card below `md`.
- **Bulk mail reaches only buyers who may be mailed.** Unfinished checkouts, unsubscribed students and students out of good standing stay out of the copy.
- **Unsubscribe is about bulk mail only.** Course emails and the course page's copy still reach unsubscribed students, because they need news about a course they joined.
- **No new API for sorting, searching or copying.** The list answer holds every customer and their enrollments, so the browser does all three, as on the course page.
- **The page shows the API's words on failure** ([web.md](web.md)).
- **Every date on this page shows in the admin's browser time zone.** The admin reads one zone, their own, whatever course or checkout a date belongs to. [use-visitor-time-zone.ts](../web/src/features/courses/course-time/use-visitor-time-zone.ts) is the twin: it reads the browser's zone only after hydration, so the server's HTML and the first browser render match.
- **No web login check yet.** [web.md](web.md)'s `requireAdminSession()` arrives with the login form. Until then this page, like the other admin pages, calls the API without it.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Every customer shows on the page. A student, a customer with at least one enrollment, sits in the main list. A customer with none sits in a separate Unfinished checkouts list, newest checkout first with its date in the admin's browser time zone, which the copy, Unsubscribe and the course columns leave alone. One unpaged API answer gives each customer's latest checkout time (the newest `Payment.createdAt`, since a returning customer reuses one row) and enrollments: the course, and when the student enrolled, was un-enrolled or was suspended | The owner wants to see everyone the shop has an email for. Someone who never paid gave their email to buy, not to get news. Mailing them risks breaking consent law in the EU, UK and Canada, and their spam reports push course emails into spam. A "0 · —" row in the main list reads as broken data. One answer carries everything milestones 3 to 7 need (revisit after use) | Unfinished checkouts in the main list and the copy (consent and spam risk; low); hiding them (the owner wants to see them; low); count and last-date fields on the customer (a second contract change; low); paging (code and tests for a small list; low) |
| Unsubscribe sets a nullable `bulkEmailUnsubscribedAt` on `Customer`; Resubscribe clears it; a purchase leaves it alone | One fact, one column. Null means they never asked to stop, and the time answers "when did they ask?". The name says it covers bulk email only, reads as a past event like `revokedAt` and `suspendedAt`, and uses the page's word | `unsubscribedAt` (doesn't say which mail); `rejectsBulkEmailsAt` (present tense beside past-event siblings, and a second word for the page's Unsubscribe); a positive boolean such as `acceptsBulkMail` (loses when); a status enum plus a changed-at column (two columns); a history table of each change (a table for one admin's clicks; medium) |
| Unsubscribe covers only the Students page's copy; the course page's copy and every course email ignore it | Students still need news about a course they joined | Leaving them out everywhere (they miss course changes) |
| One Copy button copies every subscribed student in good standing. Its label carries the count ("Copy 2 addresses"), and the note after copying says to paste into Bcc, not To | The client asked for one way to mail everyone they can. The count answers "who will this reach?" before the click. A paste into To shows every address to every student, which counts as a data breach in the EU. Un-enrolled students are often refunded ones. A suspension came from a dispute; nothing sets one today ([payments/refunds.md](payments/refunds.md)), so it reaches only old rows. A repurchase clears an un-enroll, so the rule reads today's state (revisit after use) | Two buttons, subscribed and good standing (five controls above the list on a phone; low); un-enrolled students in the copy (refunded people get promotions; low); the count only after copying (the admin learns the reach too late; low) |
| Beside Copy, on the Students page and the course page, "Show addresses" opens a popup with the same addresses, comma-separated, in a read-only box selected on open, with the Bcc warning | The owner wants a way that always works, whatever the browser does with the clipboard. Selecting on open leaves one copy keystroke | Only the red refused line (the admin has no way forward; low); the box always on the page (long lists push the students down; low) |
| A search box above the lists narrows all three lists by name or email as the admin types, ignoring case, in the browser. Copy ignores the search | J2 and J3 start from an email reply, and phones have no easy find-in-page. If the copy followed the search, a forgotten search would trim the mail list silently (revisit after use) | Browser find only (phones lack it; low); Copy follows the search (silent loss of recipients; medium); an API search parameter (contract and tests for a small list; medium) |
| Unsubscribe and Resubscribe act on one click, with no dialog, and the page re-renders through Next's `refresh()`, as Un-enroll does in [unenroll-student.action.ts](../web/src/features/admin-courses/course-view/students/unenroll/unenroll-student.action.ts) | Each undoes the other, so a slip costs one click (revisit after use) | A confirm dialog like Un-enroll (a click per student for a reversible change; low); an Undo note where the row was (complexity for the first release; low) |
| The admin nav sits in the `(signed-in)` layout, so only admin pages show it | The web app has no admin login yet, so the public header can't tell an admin from a visitor. Reading the cookie there would make the cached home page render per request | A Students link in the public header for signed-in admins (needs the login form first and per-request public pages; high) |
| The admin and public headers share one nav row: the wordmark slot, the wide links and the phone menu. Each header owns its `<header>` and passes its own wordmark and links | A change to the frame, link style or breakpoint reaches both headers | A copied admin header (two to keep in step; low); one header with a sticky flag (a prop for one difference; low) |
| The admin header scrolls away with the page; only the public header sticks | The create and edit forms pin a notice at the top (`StickyFormNotice`) and Save at the bottom. A sticky header would cover the notice and take 56px more of a phone screen (revisit after use) | A sticky admin header with the notice below it (three pinned bars on a phone, and new scroll margins on the forms; medium) |
| The admin wordmark reads "Embodying Emptiness · Admin" as plain text, not a link | There is no admin home page. A link to Students would repeat the Students link, and a link to the shop leaves the admin with no nav back (revisit after use) | A link to Students (two links to one page; low); a link to the public home (no way back; low) |
| Both headers mark the link whose address matches the page exactly, with style guide §7's pill, on wide screens and in the phone menu | The admin sees where they are, and one link piece serves both headers. An exact match leaves the edit and course pages unmarked (revisit after use) | Admin only (two link looks; low); no mark (departs from the style guide; low); a prefix match ("/" would match every public page; low) |
| Students show as one list at every width: each row lines its fields up from `md` and stacks them on phones (revisit after use) | Four fields fit one row, so a second layout would double the markup and tests for nothing. A list keeps plain HTML with no table semantics to lose | Cards below `md` and a table from `md`, like the course page (two renders of every row; medium) |
| One menu sorts the Students and Unsubscribed lists in the browser. Newest enrolled first is the default and breaks every tie. Good standing first lists students in good standing, then everyone else (revisit after use) | The answer already holds every customer, as on the course page. One rule keeps every order predictable | API sort parameters (contract and tests for small lists; medium); a menu per list (two controls for one question; low) |
| The copy button, its Bcc note and the per-enrollment access check are shared with the course page, which passes in the button's words. The course page keeps its approved label ([admin-course-view.md](admin-course-view.md) row "The copy button reads") and gains only the Bcc note | One clipboard behaviour, one refused-copy message (that doc's row "A refused copy shows a red line"), one Bcc warning and one reading of an enrollment's access. The course page's copy row rejected the count in its button, because "active" there already says who is left out | A separate copy for the Students page (two to keep in step); the count on the course page's button too (reverses that page's approved row; low) |
| The Students page calls `await connection()` before it loads | It reads no params or cookies, so Next would build it once at deploy, the list would go stale, and the build would need the API | `force-dynamic` (the same effect through an older option; low); hiding it in the shared client ([web.md](web.md) rejects that) |
| The list answer includes enrollments in deleted courses | A paying customer stays a student. Without them, such a customer would land under Unfinished checkouts (revisit after use) | Filtering them out (the wrong list for those customers; low) |

## Step 1. The admin opens the Students page and sees every student's name and email, with unfinished checkouts in their own list

- Why here: this is the walking skeleton through the database query, contract, API, web wrapper, mock and page. Every later milestone fills in this page.
- Needs: none.
- Builds on:
  - the admin get twin: `getCourseAsAdmin` in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml), the enrollment include in [admin-courses.repository.ts](../api/src/courses/repositories/admin-courses.repository.ts), and `toAdminEnrollmentResponse` in [courses.mapper.ts](../api/src/courses/courses.mapper.ts);
  - the module twin [admin-enrollments/](../api/src/admin-enrollments/) (controller, service, module);
  - `listCoursesAsAdmin` in the contract, an admin list with no paging;
  - the page twin, [the course page](../web/src/app/admin/(signed-in)/courses/[courseId]/page.tsx) (loader, `ProblemAlert`, page frame);
  - the wrapper twin [admin-courses.api.ts](../web/src/features/admin-courses/api/admin-courses.api.ts);
  - the mock twins [get-course-as-admin.ts](../web/src/mocks/handlers/admin-courses/get-course-as-admin.ts) and the [admin-courses.ts fixtures](../web/src/mocks/fixtures/admin-courses.ts);
  - the admin's browser time zone for the checkout date, from [use-visitor-time-zone.ts](../web/src/features/courses/course-time/use-visitor-time-zone.ts), with `dateOnlyFormatter` in [formatters.ts](../web/src/lib/utils/formatters.ts);
  - `Customer`, `Payment` (one per checkout attempt) and `Enrollment` in [contract.prisma](../api/src/prisma/contract.prisma). Checkout creates the customer before payment, in [checkout.repository.ts](../api/src/checkout/checkout.repository.ts).
- **Sketch:**

```
/admin/students   (no nav yet; reached by URL, like the edit page)
Students (5)                                h1
Sam Ortiz
sam@example.com          … Noa, Lee, Ben, Dana the same way
Unfinished checkouts (1)                    h2
Started a checkout and never paid.          grey help
Tal Ben · tal@example.com · Nov 3, 2026     date appears after hydration
Empty: "Students (0)" and "No students yet."   API failure: the API's message in ProblemAlert.
```

- Test data: a new fixture covering every customer case, created in 1d. It uses the finished sketch's courses and dates from the start, because milestone 6 checks them:
  - several courses, one course, suspended, and un-enrolled only;
  - Tal, with no enrollment;
  - Dana, a plain student whom milestone 4 marks unsubscribed.
  - A new handler, named after the operationId, serves the fixture with `success`, `empty` and `error`.
- Docs in the same commits:
  - 1a adds a row for the new API module to [ARCHITECTURE.md](../ARCHITECTURE.md)'s API modules table, shaped like the `enrollments/` row (`admin-enrollments/` has none to copy);
  - 1e adds the page to [README.md](../README.md)'s *Status*.
- Done when:
  - the API e2e test lists a customer with no enrollment and one with two;
  - journey in `dev:mock`:
    - open `/admin/students` with `success` → five students by name and email, and Tal under Unfinished checkouts;
    - switch to `empty` → "No students yet.";
    - switch to `error` → the API's message.
- Retro:
  - Planned 5 commits (1a to 1e); shipped 5.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: none recorded.

## Step 2. The admin reaches Students and New course from an admin nav on every admin page

- Why here: it needs a page to link to (milestone 1). It is independent of milestones 3 to 7, so it can slip without blocking them.
  - Each admin page keeps its own `main` frame and width; `grep -rn 'max-w' web/src/app/admin` prints them. The layout adds only the header above it.
  - The twins are [site-header.tsx](../web/src/features/site-layout/header/site-header.tsx) and [phone-menu.tsx](../web/src/features/site-layout/header/phone-menu.tsx).
- Needs: 1.
- **Sketch:**

```
Wide, /admin/students (the header scrolls away):
| Embodying Emptiness · Admin              New course  (Students) |
| Students (5) … page as today, its own main and width …          |
Phone:
| Embodying Emptiness · Admin                               [☰]  |
Menu open (cream sheet, 48px rows):
| New course                                                [×]  |
| (Students)                                                      |
Edit or course page: neither link marked.
Public home: | Embodying Emptiness                       (Courses) |
( ) = the current-page pill (2c)
```

- Size: 3 commits (2a to 2c), split in the Status list.
- Approved row texts, written in the commit that makes each true:
  - 2b, [web.md](web.md)'s admin-routes row becomes: "Admin routes will be `app/admin/login` and `app/admin/(signed-in)/`. The `(signed-in)` layout shows the admin header, and gains logout once the login form lands" (*Why* and *Rejected* unchanged).
  - 2c, [course-page.md](course-page.md)'s row "The header shows no scroll shadow and no current-page pill" becomes: "The header shows no scroll shadow, though style guide §7 describes one" | "The wireframe draws none (revisit after use)" | "A shadow now (a browser-side piece watching scroll, about 30 lines plus tests)". The pill moves to this doc's row on marking the current page.
- Done when: journey in `dev:mock`:
  - open the create, edit, course and Students pages → each shows the nav;
  - click Students → the list;
  - at phone width, open the menu → both links.
- Retro:
  - Planned 3 commits (2a to 2c); shipped 3.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: none recorded.

## Step 3. The admin copies the addresses of every student in good standing, by button or by hand from a popup

- Why here: it delivers J1 early, and milestone 4 then narrows the rule. The course page's copy button and its access check use that page's words and enrollment type today, so they become shared first.
- Needs: 1.
- **Sketch:**

```
Students (5)
[ Copy 3 addresses ]  Show addresses
Copied 3 addresses. Paste them into Bcc, not To.
Sam Ortiz · Noa Levi · Lee Park (Suspended) · Ben Shaw (Un-enrolled) · Dana Cohen
… otherwise as in 1 …
```

- Size: 3 commits:
  - share the copy button and the access check, a mechanical change that leaves the course page unchanged;
  - the copy with its count and Bcc note, with the course page's note gaining the Bcc warning too;
  - the Show addresses popup on both pages (shadcn's Base UI `dialog`, added by the shadcn CLI, no new package).
- Test data: milestone 1's fixture, where Lee is suspended, Ben is un-enrolled and Tal has no enrollment.
- Docs in the same commits:
  - [admin-course-view.md](admin-course-view.md)'s copy-words row gains the Bcc note;
  - that doc's refused-copy row, which rejected a hand-copy box, gives way to the popup;
  - [payments/refunds.md](payments/refunds.md)'s row on keeping the suspension column notes that this page's copy reads it.
  - All three are Decision rows, so the owner approves their text.
- Done when: J1 walked in `dev:mock`, with Dana still in the copy until milestone 4:
  - the button reads "Copy 3 addresses" and copies Sam's, Noa's and Dana's addresses;
  - the note says Bcc, not To;
  - Show addresses opens the same addresses, already selected, on this page and on the course page;
  - the course page's note after copying also says Bcc, not To.

## Step 4. The admin unsubscribes and resubscribes a student, and the copy leaves unsubscribed students out

- Why here: it's the page's one change to data, built on the lists (milestone 1) and the copy rule (milestone 3) it narrows.
- Needs: 1, 3.
- **Sketch:**

```
… main list with [ Unsubscribe ] on each student row; the copy button reads "Copy 2 addresses" …
Unsubscribed (1)
Dana Cohen · dana@example.com                    [ Resubscribe ]
Unfinished checkouts (1)  (no buttons)
```

- Size: 5 commits, in this order so the page never shows an unsubscribed student whose address still copies:
  - the column and migration, with the field in the list answer;
  - the endpoints;
  - the copy leaves unsubscribed students out;
  - the web actions and remembered mock store;
  - the buttons and the Unsubscribed section.
- Test data: the first commit marks Dana unsubscribed in milestone 1's fixture. New unsubscribe and resubscribe handlers share a remembered store of it.
- Docs in the same commits:
  - [admin-course-view.md](admin-course-view.md)'s copy row notes that unsubscribed students stay in its copy. It's a Decision row, so the owner approves its text.
  - [future-milestones.md](future-milestones.md) *Newsletter signup* notes that a newsletter could reuse the unsubscribe column.
- Done when:
  - J3 then J2 walked in `dev:mock`, by scrolling, since the fixture starts with Dana unsubscribed and milestone 5 adds search;
  - an API e2e test shows a purchase leaves an unsubscribed customer unsubscribed;
  - a failed call shows the API's message.

## Step 5. The admin finds a student by typing part of their name or email

- Why here: J2 and J3 start from an email reply, so the admin looks for one person. On a phone, scrolling a long list is the slowest part of both journeys.
- Needs: 1 (and 4 for the Unsubscribed list).
- **Sketch:**

```
Students (5)
[ Search by name or email          ]
[ Copy 2 addresses ]  Show addresses      (count ignores the search)
… only matching rows in each list …
No match: No one matches “zzz”.
Phone: the box is full width under the heading.
```

- Size: 2 commits: the match rule with its unit tests, then the box on the page with the no-match line.
- Test data: milestone 1's fixture. No new fixture.
- Done when: journey in `dev:mock` with `success`:
  - type "dana" → only Dana, in Unsubscribed;
  - type "TAL@" → only Tal, under Unfinished checkouts;
  - type "zzz" → the no-match line;
  - clear the box → every list;
  - the Copy count stays the same throughout.

## Step 6. The admin sees each student's course count, last enrolled date and courses, newest first

- Why here: the sort in milestone 7 orders by the count and date this milestone shows. It uses data the list answer carries from milestone 1, so it is web only.
- Needs: 1.
- **Sketch:** the finished page's Courses and Last enrolled columns, on the Students and Unsubscribed lists. The course list opens under the count.
- Size: 2 commits: the count and date (in the admin's browser time zone, by the Principle), then the course list. The course list can be dropped if it costs more than a disclosure.
- Done when: journey in `dev:mock` with `success`:
  - open `/admin/students` → Sam shows 3 and Nov 9, 2026, and Lee shows 1 and Oct 30, 2026;
  - open Sam's count → his three courses, newest first;
  - narrow to phone width → each row stacks, with the count and date under the name.

## Step 7. The admin sorts both student lists by newest enrolled, most courses, name or good standing

- Why here: two of its four orders read milestone 6's count and date, so the admin sees why a row sits where it does. Good standing first reads milestone 3's check. The course page's sort menu names that page's four orders today, so it becomes shared first.
- Needs: 1, 3, 6 (and 4 for the Unsubscribed list).
- **Sketch:**

```
Students (4)                       Sort by [ Newest enrolled first ▾ ]
[ Search by name or email          ]
[ Copy 2 addresses ]  Show addresses
Sam · Noa · Lee · Ben
Unsubscribed (1)  — in the same order
Unfinished checkouts — always newest checkout first
Menu: Newest enrolled first · Most courses first · Name A–Z · Good standing first
Good standing first: Sam · Noa, then Lee (Suspended) · Ben (Un-enrolled)
Phone: the label and menu wrap under the heading.
```

- Size: 3 commits:
  - share the menu, a mechanical change that leaves the course page unchanged;
  - the order function with its tie-breaker;
  - the menu on the page.
- Test data: milestone 1's fixture. No new fixture.
- Done when: journey in `dev:mock` with `success`:
  - open `/admin/students` → Sam first;
  - pick Most courses first → Sam (3) first;
  - pick Name A–Z → both student lists alphabetical;
  - pick Good standing first → Lee and Ben below Noa;
  - Unfinished checkouts keep their order throughout;
  - reload → back to Newest enrolled first.

## Open questions

- Milestone 3, can wait: the button, note and popup words, set by [style-guide.md](style-guide.md) §9.
- Milestone 4, can wait: the endpoint shape. I recommend an unsubscription sub-resource, created and deleted, like un-enroll's revocation.
- Milestone 5, can wait: the search box's words and its no-match line.
- Milestone 7, can wait: whether Name A–Z sorts by the full name as typed. I recommend yes, since the shop stores one name field.

## Out of scope

- The admin login form and logout. The nav has no Sign out until the login form lands.
- An admin course list.
- Sending bulk email from the server, a newsletter, and an unsubscribe link in emails ([future-milestones.md](future-milestones.md) *Newsletter signup*).
- A CSV export. The client sends from a mail app, not a mail service.
- Copying unfinished-checkout addresses.
- An Undo note after Unsubscribe.
- Filters by status or course.
- Showing unsubscribed status on the course page.
- Splitting the copy into batches for a mail app's recipient limit. Revisit when the list nears the app's per-message limit.
