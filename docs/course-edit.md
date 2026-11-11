# Course edit (admin web page)

Read this before working on the admin "edit course" page. It records what the code can't tell you: progress, intent, why. The create page it shares building blocks with is in [course-creation.md](course-creation.md); how updates behave in the API is in [courses.md](courses.md) *Editing a course*; endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) (`getCourseAsAdmin`, `updateCourse`, `uploadCourseImage`). Run it with `/plan-create-implementation course-edit`, then `/next-commit course-edit`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it is the next one to build.

- [x] **1. Create form rebuilt from shared building blocks.** Create behaves the same, but the form becomes a composition of shared sections, fields and hooks, with no create/edit switch.
  - [x] **1a.** Form files grouped by job (`sections/`, `problems/`, `hooks/`, `create-course/`), `CourseForm` renamed `CreateCourseForm`, hooks file split.
  - [x] **1b.** Fields and error readers are generic over the form's type; `TimeZoneField` takes its name and the paths to re-check, with a test for the re-check.
  - [x] **1c.** Schedule blocks take their names from the parent, and `ScheduleSection` is layout; create fills it in `create-course/create-course-sections.tsx`.
  - [x] **1d.** Price rows take their names from the parent, and `PricingSection` is layout; create fills it in `create-course/create-course-sections.tsx`.
  - [x] **1e.** Basics and Course material are layout; create fills them in `create-course/create-course-sections.tsx`, with the image and description as its own children.
  - [x] **1f.** The error list takes its fields from the form. The label text and price-row names are shared in `course-form/fields/`; create lists its own fields in `create-course/create-course-fields.ts`.
- [x] **2. Edit page loads and saves the details.** A separate edit form prefills name, summary, description, content link and time zone, saves with a full PUT, and goes to the home page. Start and end times, prices and status go back unchanged.
  - [x] **2a.** `DescriptionField` and `SaveButton` (takes its label) are shared in `course-form/sections/`, and `scheduleSentence` is exported from `schedule-summary.ts`; create behaves the same.
  - [x] **2b.** `focusField` and `useServerProblem` are shared and generic over the form type (`useServerProblem` takes `setError` and an optional note for the rejected message); create keeps its "saved as a draft" note.
  - [x] **2c.** The edit page's code can now turn a loaded course into the form's starting values and save changes to its name, summary, description, content link and time zone. No page uses it yet.
  - [x] **2d.** The edit form shows a course's details and saves them (no URL yet). It shares the refusal message, the content link section and the error list with the create form. The update mock can refuse twice in a row, for 2e's test.
  - [x] **2e.** The page at `/admin/courses/[courseId]/edit` loads the course and shows the form; a missing or malformed id gives Next's 404, any other problem shows `ProblemAlert`; the mock has `getCourseAsAdmin` scenarios and a `twoRounds` update scenario.
- [x] **3. Schedule rules on edit.** The admin can change the start and end date and time. An unchanged start or end time may be in the past; a changed one must be in the future; end is after start.
  - [x] **3a.** The stored start and end are their own item (`loadedSchedule`), no longer among the "fields sent back unchanged"; nothing changes for the admin.
  - [x] **3b.** The code can show a stored time as date and time boxes in a zone, and check an edited schedule (an unchanged time may be in the past, a changed one may not). Nothing uses it yet.
  - [x] **3c.** Saving sends the start and end from the four date and time boxes, and the browser and the action both refuse a broken schedule. The schedule line follows the boxes. The boxes aren't on screen yet.
  - [x] **3d.** The admin sees and edits the four date and time boxes; problems that compare boxes show on the schedule line, and a zone change re-checks the schedule.
- [x] **4. Prices on edit.** Prices in effect are read-only; future prices can be edited, added and removed.
  - [x] **4a.** The code can check edited price rows (a row still holding a loaded future price may start in the past) and turn stored cents into dollar text; create's price checks run through the same code and behave the same.
  - [x] **4b.** The shared price pieces take from the page whether a row shows Remove, the section's help line and the words for an empty start, and the price rows' error-list entries are shared; create behaves the same.
  - [x] **4c.** Saving sends the edited prices: the page splits the loaded prices into those in effect and future ones when it renders, future ones become rows, and the browser and the action refuse broken rows. The rows aren't on screen yet.
  - [x] **4d.** The admin sees the prices in effect as a read-only list, latest marked "current price", and edits, adds and removes future price rows; the page intro says only status can't be changed yet.
- [x] **5. Image upload on edit.** The page shows the current image, and a newly chosen image uploads when the admin saves, after the details.
  - [x] **5a.** Create's image input and its preview are shared pieces (`ImageInput` takes the name and a preview function; `ImagePreview` is its own file); create behaves the same.
  - [x] **5b.** The web app serves a course's stored image to the admin's browser at `/admin/courses/{courseId}/image` (404 when missing, 502 on other API problems). Nothing uses it yet.
  - [x] **5c.** Create's "save the details, then upload the image" logic is a shared hook (`use-save-then-upload-image.ts`); create keeps only its draft create-or-update and draft id, and behaves the same.
  - [x] **5d.** Saving an edited course uploads a newly chosen image after the details (no file chosen: only the `PUT`); the shared save hook works for both forms and skips the upload when no image is chosen. The picker is not on screen yet.
  - [x] **5e.** The admin sees the course's current image, or "No image yet", on the edit page and replaces it by choosing a file and saving.
- [x] **6. Status on edit.** Published, drafted, archived and deleted, with a note that publishing needs an image and a confirmation before deleting.
  - [x] **6a.** Saving an edited course uploads a newly chosen image before its details, so one save can publish a course with its first image; a retry after a refused save skips the image already stored. Create behaves the same.
  - [x] **6b.** The edit code holds the course's status as a form value, prefilled as loaded, and saves it; the API's refusal on the status lands on the status field. Not on screen yet.
  - [x] **6c.** The admin sees the course's status on the edit page and changes it, and the API's refusal to publish without an image shows on the status field.
  - [x] **6d.** Choosing Deleted and saving asks for confirmation first; Keep or Escape leaves the form as it was, and a course already deleted saves with no question.
- [x] **7. Time zone keys and Keep fixed.** Enter in the Time zone box picks the first matching zone instead of saving the course; Escape keeps the chosen zone in the box; Keep the course in the delete dialog sets the status back to the loaded one.
  - [x] **7a.** Enter in the Time zone box picks the first matching zone and never saves the course; Escape keeps the chosen zone in the box. Both pages.
  - [x] **7b.** Keep the course or Escape in the delete dialog sets the status back to the one the course loaded with, and keeps every other edit.
- [x] **8. Schedule errors on the field to change.** An end date before the start date shows on End date at once; on the same day, an end time not after the start time shows on End time.
  - [x] **8a.** Schedule problems show under the box they belong to, on both pages, and the line under the Schedule heading is gone.
  - [x] **8b.** The edit schedule tests check what the admin sees and run on a fixed clock, the create error-list test checks the whole list, and the schedule boxes and empty price rows are tidied. Nothing changes for the admin.
  - [x] **8c.** An end date before the start date shows on End date as soon as it changes, and on the same day an end time not after the start shows on End time only; the error list links to End date.
- [x] **9. Prices in plain words.** A past price start shows on the box to change, the price list says what to fix in words, amounts read $50.00, and the rows line up.
  - [x] **9a.** The schedule's date and time boxes take their "check this box and the boxes it compares with" behaviour from a shared piece; nothing changes for the admin.
  - [x] **9b.** A price start in the past shows under the box to change, on both pages; any price box change re-checks every price box already reached.
  - [x] **9c.** The price list under the rows says what to fix in words (e.g. "$50.00 from (needs a time)"), as a plain bulleted list with amounts read $50.00, on both pages.
  - [x] **9d.** The price rows line up on desktop, with Remove level with the boxes, and stack in one column at 400 px.
- [x] **10. Saving confirms and stays.** Edit stays and says "Saved"; create opens the new course's edit page saying "Saved as a draft".
  - [x] **10a.** Saving on the create page opens the new course's edit page (`?saved=draft`); edit went to `/` until 10e.
  - [x] **10b.** The error list's sticky box at the top of the form comes from a shared piece; nothing changes for the admin.
  - [x] **10c.** The edit page says "Saved as a draft" when the admin arrives from create, drops the flag from the address, and hides the note at the first change.
  - [x] **10d.** In `dev:mock` (with `scenario = "remembered"`), a saved course comes back as saved, and browser tests can use the same handlers, so the owner can walk create → edit → publish.
  - [x] **10e.** Saving on the edit page stays there, says "Saved", and loads the stored course again.
- [x] **11. Edit page explains itself.** The header shows the course's name, its status and a link to its shop page; notes explain a time zone change and a course that already ran.
  - [x] **11a.** The status labels (`courseStatusLabels`) and the shop page's address (`shopCoursePath`) each live in one shared place; nothing changes for the admin.
  - [x] **11b.** The header shows the course's saved name, its status, and a link to its shop page when the shop shows it; otherwise it says "Not in the shop".
  - [x] **11c.** Under the Schedule heading, a note says the course has started or ended, and that its times may stay but a changed time must be in the future.
  - [x] **11d.** Choosing a different time zone shows a note under the box: the dates and times stay as typed, so the course moves to that time in the new zone, and on a started course the moved times must be in the future.
- [x] **12. Delete only without students.** The API refuses to delete a course with enrollments; the edit page greys out Deleted and says to archive it instead.
- [x] **13. Accessible fields on both pages.** Status circles, field borders and focused borders are easy to see, and the check and cross marks have names a screen reader reads.
  - [x] **13a.** A screen reader names the mark beside each field: the cross reads "Needs a fix" and the check reads "Looks good", on both pages.
  - [x] **13b.** Every field's border, each status circle and a focused field's border reach 3:1 contrast against the form section, on both pages (light theme `--input` 3.26:1, `--ring` 4.69:1).
- [x] **14. Edit layout.** Status sits near the top and Save stays on screen.
  - [x] **14a.** The admin sees Status first on the edit page, above Basics, and the error list names Status first.
  - [x] **14b.** On the edit page, Save stays on screen in a bar at the bottom while the admin scrolls, at 400 px and on desktop; a field reached by Tab or from the error list shows clear of the bar and the top box.

## Journeys

Each milestone's *Done when* walks its own in `dev:mock`.

- J3 (10): the admin creates a course, lands on its edit page with "Saved as a draft", then publishes it there. Needs `scenario = "remembered"` in `src/mocks/server.ts`.
- J4 (12): on a course with students, Deleted is greyed out with "Students are enrolled. Archive it instead."

## Principles

- **The page is `app/admin/(signed-in)/courses/[courseId]/edit`.** Admins reach it by URL; the admin course list is out of scope.
- **Compose, don't branch.** Create and edit are two components built from shared blocks. A shared block takes what differs as props or children, never a `mode` flag.
- **Create and edit share no form type and no state.** Each owns its `useForm`, resolver, defaults and value type. Shared blocks are generic and take field names from the parent.
- **Save is a full PUT.** Every field, every time. Strip what the API rejects: the course id, `enrollments`, `status.changedAt` (send status as a plain string) and each price's id.
- **A failed save changes nothing,** so the form stays as it is and shows the errors. Errors can arrive in two rounds: a format error hides the state errors (past times, schedule) until fixed, so expect a second 400.
- **The "must be in the future" check applies only to a changed time,** for the schedule and for price times alike. A schedule time counts as unchanged when the boxes convert to the stored moment; a price row counts as unchanged when its amount equals a loaded future price's and its converted time equals that price's time with the seconds dropped.
- **The browser checks help the admin; the API decides.** Same as the create page.
- **After saving, the admin goes to `/`,** as on the create page. Replaced by milestone 10: create opens the edit page and edit stays on it (see *Decisions*).
- **Until the web login lands,** admin calls carry no token, so against the real API the page shows a 401. Tests and `yarn dev:mock` use MSW.
- **Every library mentioned links to its docs.**

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Create and edit are two separate form components, composed from shared sections, fields and hooks | Follows the owner's rule to compose rather than branch. No `mode` prop, and each page holds only its own rules (revisit after use) | One form with a `mode` prop (conditionals everywhere); a fully separate copy (drifts) |
| Start and end are always converted from the boxes. The browser compares the result with the stored time only to allow an unchanged time in the past. Price rows follow their own rule (row below) | One path for every save, so nothing tracks changed and unchanged times. The cost: a time in the hour that daylight saving repeats can't be saved; accepted as rare | Sending the stored string when the boxes are unchanged (handles that repeated hour; costs a second path; low) |
| Unchanged and in-effect prices are sent back as loaded | The API keeps exact matches and their ids, so the page tracks no ids | Leaving them out (also safe, but the form would hold less than the API) |
| Shared blocks are generic over the form's own value type and take field names from the parent. Sections are layout with the fields as children. There is no shared value type and no cast | Create's form has an extra field, the image, that edit's doesn't. If both pages shared one form type, edit would have to carry a field it never uses, or the code would need a trick that switches off TypeScript's checking (confirmed with `tsc`). Instead each page keeps its own form type, and the shared pieces work with whichever fields the page gives them. An earlier attempt failed because field names were written inside the shared pieces, not because sharing was impossible (an architect review re-tested it). The compiler can't check a field name inside a shared piece, so the page passes the names in. They are expected to match between create and edit; this setup exists to avoid the trick, not to allow different names | A shared `CourseFormValues` with one cast, `savedFieldsForm` (leaks create's extra field into the shared code); `FormProvider` and `useFormContext` (moves the unchecked step into the library; blocks can't render alone); image outside the form (changes create's validation) |
| Until steps 3, 4 and 6, the edit form holds only name, summary, description, content link and time zone. Start and end times, prices and status go back in the PUT exactly as loaded (the "fields sent back unchanged") | Their boxes need edit's own rules (an unchanged time sent as the original UTC string, in-effect prices read-only), which are steps 3 and 4. Carrying them makes every course savable now, started ones included | Boxes now with no browser time checks (gives a whole form at once; costs most of 3 and 4 pulled forward, or 400s from the API on unchanged past times; high complexity); re-reading the course in the action and merging (gives fresh values; costs a GET per save and is thrown away once those fields move into the form; medium) |
| On edit, until step 3 ships, changing the time zone keeps the start and end moments, and the schedule line shows them in the new zone. From 3c the typed date and time stay and the moment moves (6:00 PM EST becomes 6:00 PM CST) (revisit after use) | Until the boxes exist, the kept times are sent unchanged, so they can't move. After that, a zone change usually fixes a zone entered wrongly. The cost: on a course that has started, the moved time counts as changed and is refused as being in the past | Keeping the moment and re-showing the boxes in the new zone (can fix a started course's zone; costs a hidden recalculation the admin doesn't expect; medium) |
| The edit checks are built for each course from the stored start and end, which sit beside the form values, not inside them | The checks need the stored times, and the form values stay exactly what the admin edits | Hidden form values (a fixed schema and fewer props; puts data the admin can't edit into the values; low) |
| The browser gets the form's values and the fields sent back unchanged, never the whole `AdminCourse` | Its `enrollments` hold customers' emails and payment details, and a client component's props are sent to the browser | Passing `AdminCourse` to the form (simpler props; leaks customer data into the page) |
| A price row counts as unchanged when its amount equals a loaded future price's and its converted time equals that price's time with the seconds dropped. It is then sent exactly as loaded | Stored price times can hold seconds (create's "when saved" is now + 1 minute), and the boxes show minutes only. An exact comparison would call an untouched row changed and refuse it as too soon, or delete and re-insert it. A one-minute window would treat a row moved by one minute as unchanged and lose the edit. The cost: a time in the hour a daylight-saving change repeats can't be converted, so that price must be moved before the course saves; accepted as rare, as for the schedule | An exact comparison of converted moments, as the schedule does (breaks for prices with seconds; low); comparing the boxes with the loaded price's boxes (also handles the repeated hour; costs a second comparison path; low) |
| The page splits the loaded prices into those in effect and future ones once, when it renders on the server | The server and the browser would otherwise each use their own clock, so a price starting during the load could render differently in each. The cost: a future price that starts while the page is open stays an editable row; sent untouched, the API keeps it, and removed, the API keeps it anyway | Splitting in the browser on each render (live; risks a mismatch between the two renders and rows that move under the admin; medium) |
| On edit, an empty price date and time means "when you save" (now + 1 minute, as create's request). The prices in effect show as a read-only list, oldest first, the latest marked "current price", in the chosen zone (revisit after use) | Create's "when the course is published" is wrong for a course that is already published. The full list is what the PUT sends back | Requiring a date and time on every edit row (more typing for an immediate change; low); showing only the current price (shorter; hides prices the PUT keeps; low) |
| Create and edit share the save steps (messages, saved flag, going home); each picks its own order of image and details | Without it, the "details saved, image failed" message, the retry and the thrown-action note would be written twice and drift apart. The cost: edit can't upload while its details `PUT` is still running, so a save takes the two steps' time | Uploading at the same time as the `PUT` (faster; needs edit's own save code and a message for each of four outcomes, and nothing shared; medium) |
| Edit uploads a newly chosen image before saving the details; create keeps details then image | One Save can publish a course together with its first image, because the API refuses publishing with no stored image. The cost: a refused `PUT` leaves the new image stored anyway, so a retry skips the upload. Create can't upload first, since it needs the new course's id | Details first, then image (publishing a first image takes two saves; low); three steps with a second `PUT` (a new partial-failure case; medium) |
| The browser doesn't check "publishing needs an image", and the status options carry no image hint; the API's refusal shows on the status field | The image is stored before the `PUT` runs, so the API's own check is right whenever an image is chosen or stored. The status code then needs no image knowledge | A browser check with a `hasImage` value passed to the schema and action (a second copy of the rule; medium); a "Needs an image" note on Published (misleads when an image is chosen in the same form; low) |
| After a partly failed save, the next Save changes sends both steps again | Create already does this (its draft update repeats). Edit's form always sends what the admin sees. The cost: a time changed and saved by the first click, now compared with the originally loaded time, can be refused as "in the past" if it has since passed; accepted as rare | Remembering which step is stored and redoing only the failed one (extra state, and edits to the stored step are dropped; medium) |
| The stored image is a plain `<img>` from a web route `/admin/courses/{id}/image` | The API's admin image is never cached, so the admin sees what is stored. `next/image` would cache an old copy and needs an allow-list entry | `next/image` (stale after replacing; low) |
| The delete confirmation uses shadcn alert-dialog | Matches the existing shadcn/base-ui setup | An inline confirmation step |
| The time zone picker marks the first match as the admin types ([Base UI Combobox](https://base-ui.com/react/components/combobox) `autoHighlight`), and Enter in the box never saves the course | When nothing is marked (no match, or the list is closed), Base UI lets Enter through, and the form saves the course while the admin is still choosing a zone | Base UI's default (Enter with no match saves the course; none); blocking Enter only when nothing matches (Enter on a closed list still saves; low) |
| Keep the course and Escape in the delete dialog set the status back to the one the course loaded with; other edits stay | Otherwise Deleted stays chosen after the admin said keep. The loaded status is never Deleted, because a course loaded as Deleted never asks (revisit after use) | The last status chosen before Deleted (matches Drafted→Archived→Deleted; costs remembered state; low); leaving Deleted chosen (6d's behaviour; the next Save asks again; none) |
| A message comparing two schedule boxes shows under the box to change: End date when the date is earlier, End time on the same day. The line under the Schedule heading goes, on both pages (revisit after use) | The UX review found End time named while End date was wrong, and the heading sits far from the box. Replaces create's decision on cross-field schedule messages | Keeping the heading line |
| The flow is create → edit → publish. After a save, edit stays, refreshes the stored course and shows "Saved"; create opens the new course's edit page through a query flag that shows "Saved as a draft" | Going to the shop proves nothing and leaves no way back. The refresh keeps the "unchanged time" checks right for the next save | Staying on create (a second Save makes a second course); a message, then still going to `/` (no way back; low) |
| The price list under the rows names the broken part in words, as a plain list, with amounts as $50.00, on both pages (revisit after use) | A red "Error" doesn't say what to fix. Replaces create's U3b wording | Keeping "Error" and Roman numerals |
| A price start in the past shows under Start date when its day has passed in the chosen zone, otherwise under Start time. A change in any price box re-checks every price box already reached, on both pages (revisit after use) | Follows step 8's rule that a message shows under the box to change. Without the re-check, a message would stay under a box after the admin fixed the other one | Always on the date box (points at a correct date when only today's time is past; low); keeping it on the time box (low) |
| A course with enrollments can be archived but not deleted. Every enrollment counts, refunded or disputed too. The API refuses a change to `deleted` with a `/status` field error coded `HAS_ENROLLMENTS`, and the page greys out Deleted with the reason, unless the course is already deleted (revisit after use) | Students who paid keep a course the admin can still find, including the course behind a refund or dispute. The page already shows field errors under the status field. The rule counts only existing enrollments, so a buyer whose checkout is still open (up to 31 minutes) can pay after the admin deletes the course. The gap is accepted for launch and the admin can set the status back; it is listed in [future-milestones.md](future-milestones.md) | A top-level 409 `COURSE_HAS_ENROLLMENTS` (clearer for API callers; shows in the top alert, away from Status; low); counting open checkouts in the rule (closes the window; costs a rule that reads checkout state; medium); locking the course row during the check (closes only the instant between check and write; needs row locking from the Prisma 8 RC; medium) |
| After a save, the details action calls Next's `refresh()` so the reloaded page arrives in the action's own reply, the form takes the reloaded course as React Hook Form's `values`, and "Saved" shows in a transition after that | The "unchanged time" checks and the price split stay right for the next save, and "Saved" appears only once the form holds the stored course. Without it, a change typed between "Saved" and a late reload was wiped, and CI caught it. The transition orders "Saved" after the page update; the tests mock `refresh`, so only the repeated browser run proves that order | The browser's `router.refresh()` after "Saved" (a second request that nothing waits for; wiped edits typed in between; high); Building the new form values in the action from the `PUT` answer (no second request; costs a second place that splits prices in effect, beside the page's; medium) |
| "Saved" and "Saved as a draft" show in the sticky box at the top of the form, where the error list shows, until the form holds an unsaved change (revisit after use) | The admin sees every answer to a save in one place, from anywhere on the page | Beside Save (misses "Saved as a draft" on arrival; low); one note under the heading plus one by Save (two spots; low) |
| The header links to the shop only when the shop shows the course (published, with a price in effect); a course whose start has passed shows a note under Schedule, worded "started" or "ended" (revisit after use) | A draft's link would open a 404, and a refused past time would come with no explanation | Always linking (a 404 for every draft; none); a note only for ended courses (no explanation while a course runs; low) |
| `dev:mock` and the browser tests have a `remembered` scenario: create, update and upload store the course, and get-as-admin returns it | Without it, a save reloads the sample course and the form snaps back | Changing the default success handlers (Vitest shares the server, so state would leak between tests; low) |
| The mark beside each field is a named image: the cross reads "Needs a fix", the check "Looks good" (revisit after use) | A screen-reader user gets the same "fixed" or "still wrong" signal that a sighted admin gets from the mark. The field's own message still says what to fix | Adding the words to the input's description (heard on focus; repeats the error message on every invalid box; low); keeping the marks hidden (the check's signal reaches only sighted admins; none) |
| Every field border, status circle and focused border reaches 3:1 against the form section. The light theme's `--input` and `--ring` colours darken, and the boxes, the description editor and the circles all use them | WCAG 1.4.11 asks for 3:1 on the edge that shows a control, and every field used one faint colour (1.19:1 on the section). Focus would otherwise make the edge lighter than at rest | A class on the status circles only (the boxes stay faint; low); editing the shadcn radio (a local change in generated code; low); keeping `--ring` (focus would lighten the edge; none) |
| The date and time boxes keep their own description, and the "Runs … Lasts …" line under Schedule stays a live announcement only | Step 8 moved the cross-box errors under each box, and the boxes already point to them. The line now only restates the boxes | Pointing the four boxes at the line (heard on focus; costs a new prop through `ValidatedField` and two shared schedule files; low) |

## Step 1. Create form rebuilt from shared building blocks

- Why here: edit needs the same sections and fields; extracting them first means milestone 2 composes instead of forking or adding a `mode` prop.
- Needs: none.
- Builds on: [course-form/](../web/src/features/admin-courses/course-form/) (sections, fields, hooks, `use-save-new-course.ts`), [course-form.tsx](../web/src/features/admin-courses/course-form/course-form.tsx), [CLAUDE.md](../CLAUDE.md) *Conventions* (files per folder, folder grouping, diagram of file moves).
- Size: 6 commits (1a mechanical; 1b–1f one shared area each: fields, schedule, prices, basics, error list).
- Risk: low; behaviour must not change.
- Done when: the create form tests and the Playwright `create-course.spec.ts` pass unchanged; the folder-count command prints nothing; a before/after diagram of each changed folder is shown.

Retro:

- Planned 2 commits; shipped 3 (8a, 8b, 8c).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Step 9. Prices in plain words

- Why here: follows 8's rule for where an error shows.
- Needs: 8.
- Builds on: [price-row-issues.ts](../web/src/features/admin-courses/validation/price-row-issues.ts) (the price checks), the schedule error placement from 8a and 8c (a message shows under the box to change), and the Decision row on the price list's wording.
- Size: 4 commits (a shared re-check piece first; the row layout on its own).
- Risk: none.
- Done when: a half-filled row reads "$50.00 from (needs a time)", with no "Error" text; rows line up at 400 px.
- Can wait: the row layout breakpoint (9d).

Retro:

- Planned 4 commits; shipped 4 (9a–9d).
- Owner changes after using the page: none known.
- Remove's offset is a fixed `mt-8` matching the label height; a wrapping label would misalign it.

## Step 10. Saving confirms and stays

- Why here: the header in 11 shows the saved state.
- Needs: none.
- Builds on: [use-save-steps.ts](../web/src/features/admin-courses/course-form/hooks/use-save-steps.ts) (the shared save steps), [error-summary.tsx](../web/src/components/form/error-summary.tsx) (the sticky box), [edit-form-prefill.ts](../web/src/features/admin-courses/edit-course/edit-form-prefill.ts) (the loaded course as form values), and the Decision rows on the flow and the save steps.
- Size: 5 commits (the map said 2 to 3): create's landing; the shared sticky box; the draft note; a mock that remembers saves; edit's stay.
- Risk: after a save that stays, the stored schedule and loaded prices are stale unless the page refreshes them; the leave warning must reset.
- Done when: J3; a second Save after a past time was saved is not refused; browser tests updated.

Retro:

- Planned 5 commits; shipped 5 (10a-10e).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Step 11. Edit page explains itself

- Why here: needs 10's saved state for the header.
- Needs: 10.
- Size: 2 to 3 commits.
- Builds on: [page.tsx](../web/src/app/admin/(signed-in)/courses/[courseId]/edit/page.tsx), [edit-form-prefill.ts](../web/src/features/admin-courses/edit-course/edit-form-prefill.ts) (the price split at render), [status-section.tsx](../web/src/features/admin-courses/edit-course/status/status-section.tsx) (the status labels), [course-card.tsx](../web/src/features/courses/list/course-card.tsx) (the shop address), and the Decision rows on a zone change and on the refresh after a save.
- Risk: "already ran" needs the server's clock, as the price split does.
- Done when: a past course in `dev:mock` shows its note; the header shows name and status.

Retro:

- Planned 3 commits; shipped 4 (11a–11d).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Step 12. Delete only without students

- Why here: the status section must be right before 14 moves it.
- Needs: 7.
- Builds on: [course-update-rules.ts](../api/src/courses/validation/course-update-rules.ts) (the rules that read the stored course, including the "publishing needs an image" rule this one sits beside), [status-section.tsx](../web/src/features/admin-courses/edit-course/status/status-section.tsx), [edit-form-prefill.ts](../web/src/features/admin-courses/edit-course/edit-form-prefill.ts) (what the browser may receive), and the Decision rows on the status, the customer data kept out of the browser, and the refusal of a status change on the status field.
- Size: 2 commits (the map said 3): the API rule, then the page. The mock scenarios are test support, so they join the page commit.
- Risk: a buyer with an open checkout pays after the delete (see the Decision row and [future-milestones.md](future-milestones.md)).
- Done when: an API test refuses deleting a course with enrollments; J4.

Retro:

- Planned 2 commits; shipped 2 (12a, 12b).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Step 13. Accessible fields on both pages

- Why here: independent of 8 to 12; touches shared field pieces.
- Needs: 7.
- Builds on: [validated-field.tsx](../web/src/components/form/validated-field.tsx) (the mark beside every field), [form-section.tsx](../web/src/components/form/form-section.tsx) (the tint every field sits on), [globals.css](../web/src/app/globals.css) (the `--input` and `--ring` colours), [status-section.tsx](../web/src/features/admin-courses/edit-course/status/status-section.tsx) (the status circles), and the Decision rows on the marks' names, field border contrast and the schedule line.
- Size: 2 commits (the map said 2).
- Risk: none.
- Done when: the accessibility tree names each mark ("Needs a fix", "Looks good"); field borders, status circles, focused borders and the marks measure 3:1 or more against the section tint.

Retro:

- Planned 2 commits; shipped 2 (13a, 13b).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Step 14. Edit layout

- Why here: layout last, after the content it moves exists.
- Needs: 11, 12.
- Builds on: [edit-course-form.tsx](../web/src/features/admin-courses/edit-course/edit-course-form.tsx) (the section order and Save), [edit-course-fields.ts](../web/src/features/admin-courses/edit-course/edit-course-fields.ts) (the error list's order), [status-section.tsx](../web/src/features/admin-courses/edit-course/status/status-section.tsx), [sticky-form-notice.tsx](../web/src/components/form/sticky-form-notice.tsx) (the sticky top box), and the Decision row on where "Saved" and the error list show.
- Size: 2 commits (the map said 2).
- Risk: Chrome may apply `scroll-margin` on focus differently than assumed (confidence medium); 14b's browser test proves it.
- Done when: at 400 px and desktop, Save stays visible while scrolling; status sits above Basics.

Retro:

- Planned 2 commits; shipped 2 (14a, 14b).
- Owner changes after using the page: none known.
- Rule friction: none known.

## Out of scope

- The admin course list and navigation to the edit page.
- Drag-and-drop for the image (the native file input stays).
- The web login.
- The payout estimate under the price.
- A Playwright test comparing the image preview with the saved image.

## Changes

| Date | Change |
|---|---|
| 2026-10-30 | Milestone 1: the 2 planned commits became 6 (1a done; 1b split into 1b–1f) after the size check. Two tests are added first because none pinned them. |
| 2026-10-30 | Milestone 2: split into 5 commits. A course saved from the create page has a price already in effect, so price and time boxes can't be saved before steps 3 and 4. Step 2 therefore edits five fields and sends start, end, prices and status back as loaded; the UTC-to-boxes and cents-to-dollars conversions moved to steps 3 and 4. |
| 2026-11-02 | Milestone 3: split into 4 commits (the map said 2 to 3), because the stored times must move out of "sent back unchanged" first and the checks are worth reviewing apart from the save. Two decisions changed: a zone change now keeps the typed times and moves the moment, and start and end are always converted from the boxes. |
| 2026-11-02 | Milestone 4: split into 4 commits. A review found that stored price times can hold seconds, so a price row counts as unchanged when its amount matches and its time is less than a minute from the loaded one. The shared price pieces' props moved into one mechanical commit so the list and rows go on screen together. |
| 2026-11-02 | 4a: the unchanged rule became "the time equals the loaded one with seconds dropped", because a one-minute window treated a row moved by one minute as unchanged and lost the edit. The dollar conversions moved to `price/dollar-amount.ts`, not the schema file, because the price checks importing the schema file would form an import loop. 4a changed 8 files with the owner's OK. |
| 2026-11-02 | 4c: built as one commit of 9 files with the owner's OK (the line named 7). Create's price row schema and the "row still holds a loaded future price" match are now exported, so edit reuses them instead of copying the rules. |
| 2026-11-02 | Milestone 5: split into 5 commits (the map said 2 to 3). Two mechanical commits (5a, 5c) move create's image input and its "details, then image" save into shared pieces, so edit reuses them instead of writing a second copy; the details save and the screen follow as 5d and 5e. The owner chose saving in order, like create, over uploading at the same time as the details. |
| 2026-11-03 | Milestones 7–14 added from a UX review of the edit page. Three earlier decisions reopened: where Save goes (now create → edit → publish), where schedule comparison errors show, and the price list's "Error" wording. New rule: a course with enrollments can only be archived. |
| 2026-11-02 | Milestone 6: split into 4 commits (the map said 3). The owner chose uploading the image before the details on edit, so one save can publish a course with its first image, and dropped the browser check for "publishing needs an image" (the API's refusal shows on the status field). |
