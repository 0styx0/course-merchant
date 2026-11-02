# Course edit (admin web page)

Read this before working on the admin "edit course" page. It records what the code can't tell you: progress, intent, why. The create page it shares building blocks with is in [course-creation.md](course-creation.md); how updates behave in the API is in [courses.md](courses.md) *Editing a course*; endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) (`getCourseAsAdmin`, `updateCourse`, `uploadCourseImage`). Run it with `/plan-create-implementation course-edit`, then `/next-commit course-edit`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes **Next**.

- [x] **1. Create form rebuilt from shared building blocks.** Create behaves the same, but `CourseForm` becomes a composition of shared sections, fields and hooks, with no `mode` prop and no create/edit conditionals.
  - [x] **1a.** Form files grouped by job (`sections/`, `problems/`, `hooks/`, `create-course/`), `CourseForm` renamed `CreateCourseForm`, hooks file split.
  - [x] **1b.** Fields and error readers are generic over the form's type; `TimeZoneField` takes its name and the paths to re-check, with a test for the re-check.
  - [x] **1c.** Schedule blocks take their names from the parent, and `ScheduleSection` is layout; create fills it in `create-course/create-course-sections.tsx`.
  - [x] **1d.** Price rows take their names from the parent, and `PricingSection` is layout; create fills it in `create-course/create-course-sections.tsx`.
  - [x] **1e.** Basics and Course material are layout; create fills them in `create-course/create-course-sections.tsx`, with the image and description as its own children.
  - [x] **1f.** The error list takes its fields from the form. The label text and price-row names are shared in `course-form/fields/`; create lists its own fields in `create-course/create-course-fields.ts`.
- [x] **2. Edit page loads and saves the details.** A separate edit form prefills name, summary, description, content link and time zone, saves with a full PUT, and goes to `/`. Start and end times, prices and status go back unchanged.
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
- [ ] **5. Image upload on edit.** The page shows the current image, and a newly chosen image uploads when the admin saves, after the details.
  - [x] **5a.** Create's image input and its preview are shared pieces (`ImageInput` takes the name and a preview function; `ImagePreview` is its own file); create behaves the same.
  - [x] **5b.** The web app serves a course's stored image to the admin's browser at `/admin/courses/{courseId}/image` (404 when missing, 502 on other API problems). Nothing uses it yet.
  - [ ] **5c.** Create's "save the details, then upload the image" logic becomes a shared hook. Create behaves the same. *(mechanical, coverage first)* **Next**
    - *Files*:
      - `course-form/hooks/use-save-then-upload-image.ts` (new; takes one function that saves the details, plus the words for "the details are saved")
      - [use-save-new-course.ts](../web/src/features/admin-courses/create-course/use-save-new-course.ts) (shrinks to the draft create-or-update and the draft id)
      - Folder counts: `course-form/hooks/` 4 → 5.
    - *New shared pieces*:
      - The hook: details first, then the image. Each refusal shows the API's message and puts its errors on the fields. A thrown action shows the usual message plus the "details are saved" note once they were. The route to `/` is its last step.
      - The form-data builder and the image-failed message, both moved out of create's hook.
    - *Done when*: the create-form tests pass unchanged, including the image-failed and retry cases.
  - [ ] **5d.** Saving an edited course can also upload a newly chosen image, after the details. The picker is not on screen yet.
    - *Files*:
      - [edit-course-form-schema.ts](../web/src/features/admin-courses/validation/edit-course-form-schema.ts) (optional `image`, checked with `courseImageSchema`)
      - [edit-form-prefill.ts](../web/src/features/admin-courses/edit-course/edit-form-prefill.ts) (image starts empty; carries the stored image version, or null)
      - [use-save-edited-course.ts](../web/src/features/admin-courses/edit-course/use-save-edited-course.ts) (wraps the shared hook around `saveEditedDetailsAction`)
    - *Behaviours*:
      - No file chosen: only the `PUT` runs, exactly as today.
      - Image left as it was (only other fields edited): the upload action is not called and the MSW upload handler records no request; the `PUT` body has no image.
      - Details refused: no upload is sent, and the API's message and field errors show.
      - Details saved, image refused: "The course details were saved, but the image didn't upload. <API detail>", with the error on the image field. The form stays.
      - Both succeed: go to `/`.
      - An action that throws: "Couldn't save the course. Something went wrong while saving. Check your connection and try again." Once the details are saved, the note says so.
      - The file fails the browser check: refused before any request, with the `courseImageSchema` message.
      - The next click on Save changes sends both again (the one case where the same chosen file goes up twice).
    - *New shared pieces*: none.
    - *Needs*: 5c.
    - *Done when*: the tests for each behaviour pass.
  - [ ] **5e.** The admin sees the course's current image, or "No image yet", on the edit page and replaces it by choosing a file and saving.
    - *Files*:
      - [edit-course-sections.tsx](../web/src/features/admin-courses/edit-course/edit-course-sections.tsx) (the basics section gets the shared `ImageInput`, with the stored image as its preview)
      - [edit-course-form.tsx](../web/src/features/admin-courses/edit-course/edit-course-form.tsx)
      - [edit-course-fields.ts](../web/src/features/admin-courses/edit-course/edit-course-fields.ts) (error-list entry for the image)
      - [admin-courses.ts](../web/src/mocks/fixtures/admin-courses.ts) (a course with an image)
      - `web/src/features/admin-courses/image/course-image-route.ts` (new; the web app's address for a course's image, moved here from 5b because knip refuses an unused file)
      - Tests: `edit-course/tests/edit-course-form.image.test.tsx`, `edit-form-prefill.test.ts` and [edit-course.spec.ts](../web/tests/browser/admin-courses/edit-course.spec.ts).
      - Docs: tick here, the admin-image line in [courses.md](courses.md), and the README status.
      - Folder counts: `edit-course/tests/` 6 → 7.
    - *Behaviours*:
      - Shows the stored image from the route (5b), else "No image yet. A course needs one before it can be published."
      - A chosen file replaces the stored image in the preview.
      - Stored `<img>` fails to load: "The stored image couldn't be loaded."
      - Playwright, save with a new image: the course `PUT` body has no image.
      - Playwright, save with only a new name on a course that has an image: no request goes to the image endpoint.
    - *New shared pieces*: none.
    - *Needs*: 5a, 5b, 5d.
    - *Done when*: the tests pass and the owner has used the page in `dev:mock`.
- [ ] **6. Status on edit.** Published, drafted, archived and deleted, with a warning before publishing without an image and a confirmation before deleting.

## Principles

- **The page is `app/admin/(signed-in)/courses/[courseId]/edit`.** Admins reach it by URL; the admin course list is out of scope.
- **Compose, don't branch.** Create and edit are two components built from shared blocks. A shared block takes what differs as props or children, never a `mode` flag.
- **Create and edit share no form type and no state.** Each owns its `useForm`, resolver, defaults and value type. Shared blocks are generic and take field names from the parent.
- **Save is a full PUT.** Every field, every time. Strip what the API rejects: the course id, `enrollments`, `status.changedAt` (send status as a plain string) and each price's id.
- **A failed save changes nothing,** so the form stays as it is and shows the errors. Errors can arrive in two rounds: a format error hides the state errors (past times, schedule) until fixed, so expect a second 400.
- **The "must be in the future" check applies only to a changed time,** for the schedule and for price times alike. A schedule time counts as unchanged when the boxes convert to the stored moment; a price row counts as unchanged when its amount equals a loaded future price's and its converted time equals that price's time with the seconds dropped.
- **The browser checks help the admin; the API decides.** Same as the create page.
- **After saving, the admin goes to `/`,** as on the create page.
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
| Create and edit share one save hook: save the details, then upload the image | Without it, the "details saved, image failed" message, the retry and the thrown-action note would be written twice and drift apart. The cost: edit can't upload while its details `PUT` is still running, so a save takes the two steps' time | Uploading at the same time as the `PUT` (faster; needs edit's own save code and a message for each of four outcomes, and nothing shared; medium) |
| After a partly failed save, the next Save changes sends both steps again | Create already does this (its draft update repeats). Edit's form always sends what the admin sees. The cost: a time changed and saved by the first click, now compared with the originally loaded time, can be refused as "in the past" if it has since passed; accepted as rare | Remembering which step is stored and redoing only the failed one (extra state, and edits to the stored step are dropped; medium) |
| The stored image is a plain `<img>` from a web route `/admin/courses/{id}/image` | The API's admin image is never cached, so the admin sees what is stored. `next/image` would cache an old copy and needs an allow-list entry | `next/image` (stale after replacing; low) |
| The delete confirmation uses shadcn alert-dialog | Matches the existing shadcn/base-ui setup | An inline confirmation step |

## Step 1. Create form rebuilt from shared building blocks

- Why here: edit needs the same sections and fields; extracting them first means milestone 2 composes instead of forking or adding a `mode` prop.
- Needs: none.
- Builds on: [course-form/](../web/src/features/admin-courses/course-form/) (sections, fields, hooks, `use-save-new-course.ts`), [course-form.tsx](../web/src/features/admin-courses/course-form/course-form.tsx), [CLAUDE.md](../CLAUDE.md) *Conventions* (files per folder, folder grouping, diagram of file moves).
- Size: 6 commits (1a mechanical; 1b–1f one shared area each: fields, schedule, prices, basics, error list).
- Risk: low; behaviour must not change.
- Done when: the create form tests and the Playwright `create-course.spec.ts` pass unchanged; the folder-count command prints nothing; a before/after diagram of each changed folder is shown.
- Design notes *(temporary)*:
  - The summary props on `ScheduleSection` and `PricingSection` stay as they are.
  - These stay in create until milestone 2 needs them:
    - `focusField`;
    - the defaults and the resolver;
    - the save button label.
  - `use-save-new-course.ts` is create-only: its draft-then-image flow doesn't apply to edit.
  - The shared form type is a `Pick` of the members the blocks use (`register`, `formState`, `control`, `trigger`, `getFieldState`, `setValue`, `watch`). It avoids `handleSubmit`, which a form with other fields can't fit. A `tsc` probe on 2026-10-30 accepted create's form with no cast.
  - Create's own pieces live in `create-course/`: its defaults, `emptyPrice`, its field list and its row names. Edit will own its versions.
  - Folder counts: `create-course/` 3 files → 5 (plus `tests/`); `price/` 4 → 5 (done); `course-form/sections/` stays 4.

## Step 2. Edit page loads and saves the details

- Why here: the thinnest end-to-end path (load, prefill, save).
- Needs: 1.
- Size: 5 commits (2a–2b make create's display and error pieces shared; 2c server, 2d form, 2e page).
- Risk: the description JSON going into the editor, and building a full PUT from the loaded course. Turning UTC times and cents into form values moves to steps 3 and 4.
- Done when: in `dev:mock`, the owner edits any course's name and saves; an API 400, then a second 400, show as errors and keep the form; the owner has used the page.
- Design notes *(temporary)*:
  - **Fields sent back unchanged**: the fields of the loaded course the form doesn't edit yet (start and end UTC strings, prices without ids, the status name). They go back in the PUT unchanged. Steps 3, 4 and 6 each move one into the form.
  - The page (server) converts the `AdminCourse`; the form gets only plain values, the fields sent back unchanged, the course id and the zone list. `enrollments` never reach the browser.
  - Reuse: `InputField`, `TimeZoneField` (`recheck: []`), `BasicsSection`, `CourseMaterialSection`, `ScheduleSection`, `courseFieldLabels`, `courseFormProblems`, `ErrorSummary`, `useLeaveWarning`, `useFocusSummaryOnSubmit`, `toCourseDescription`, `fieldErrorsFromProblem`, the `CourseActionResult` helpers and `ProblemAlert`.
  - Create's `retryDraftSaveAction` stays create's (its draft retry always sends `drafted`); edit gets its own action in `save-course/edit/`.
  - Errors work as on create. A field error the form has no field for shows only in the message above the form.
  - UI states: first load is clean; a zone pick changes only the schedule line; the error list appears only after a refused save; no error involves two fields.
  - No web login yet, like create (see Principles).
  - Playwright covers load, save and 404; Vitest covers the errors.
  - Folder counts: `save-course/` stays at 10 files, plus the sub-folder `edit/` (2); `edit-course/` 6 files plus `tests/`; `validation/` 4 → 5; `mocks/handlers/` 5 → 6.
  - Page sketch (the owner approved it with the plan):

```
Edit course
Change the course details. Start and end times, prices and
status can't be changed here yet.

[error list: hidden until a save is refused]

Basics — What students see when they browse for the course.
  Course name   [React Fundamentals              ]  18 / 100
  Summary       [Learn React.                    ]  12 / 300
  Description   [B I • 1. link ][editor          ]
Course material — The material students get after they buy.
  Content link  [https://example.com/course      ]
Schedule — When the course runs.
  Time zone     [America/New_York           ▾]
  Runs Oct 1, 2026, 2:00 PM to Oct 1, 2026, 4:00 PM
  (America/New_York). Lasts 2 hours.
[Save changes]
```

## Step 3. Schedule rules on edit

- Why here: step 2 sends start and end back as loaded; this step makes them editable, with an unchanged past time allowed.
- Needs: 2.
- Size: 4 commits (3a moves code; 3b the checks; 3c the save; 3d the boxes on screen). The map said 2 to 3.
- Risk: turning the loaded UTC start and end into date and time boxes in the chosen zone; reuse [wall-clock-time.ts](../web/src/features/admin-courses/schedule/wall-clock-time.ts), no new date library.
- Done when: tests cover a started course saved with unchanged times, a changed past time refused, end not after start refused, and a zone change moving the times.
- Design notes *(temporary)*:
  - "Unchanged" means only that the converted moment equals the stored moment, to the millisecond. It is used only to allow a past time.
  - The API will refuse seconds (separate API work, not this milestone), so the boxes hold minutes only.
  - Reuse: `wallClockToUtc`, `scheduleSummary`, `ScheduleDateTimeFields`, `ScheduleProblems`, `fieldErrorsFromProblem` (it already puts the API's start and end errors on the time boxes).
  - Folder counts: `validation/` 5 → 7 in 3b.
  - Flow:

```
Admin opens the edit page                                existing (2e)
└── boxes filled from stored start/end in course zone     3c (helper 3b)
Admin changes the zone → boxes keep 6:00 PM               3c
Admin clicks Save changes
└── per-course schema converts and checks start and end   3c
    ├── DST gap/repeat → daylight-saving message          existing, 3b
    ├── equals stored time → may be in the past           3b
    ├── changed, in the past → "must be in the future"    3b
    ├── end ≤ start → "must be after the start time"      existing, 3b
    │   (form kept, no request; shown on the schedule line   3d)
    └── fine → action re-checks, PUT with converted times   3c
        ├── API 400 → errors on the time boxes, form kept   existing (2d)
        └── success → home page                            existing
```

  - Page sketch (Schedule section, after 3d):

```
Schedule — When the course runs.
  [schedule problems line: hidden until a save is refused]
  Time zone   [America/New_York ▾]
  Start date  [2026-10-01]   Start time [18:00]
  End date    [2026-10-01]   End time   [20:00]
  Runs Oct 1, 2026, 6:00 PM to Oct 1, 2026, 8:00 PM
  (America/New_York). Lasts 2 hours.
```

## Step 4. Prices on edit

- Why here: same unchanged-time rule as step 3, applied to price times.
- Needs: 2.
- Size: 4 commits (4a the checks; 4b shared pieces take create's choices as props; 4c the save; 4d the list and rows on screen).
- Risk: turning stored cents into dollar boxes, and stored price times with seconds; otherwise none beyond step 3's.
- Done when: tests cover in-effect prices read-only, a new or edited price in the past refused, duplicate times refused, at least one price required only when none is in effect; the owner has used the page.
- Design notes *(temporary)*:
  - **Prices in effect**: loaded prices starting at or before the moment the page renders. **Loaded future prices**: the rest. Both keep the API's shape without ids and sit beside the form values, like the stored schedule. Only the future ones become rows.
  - The PUT lists the rows first, in row order, then the prices in effect, so the API's `/prices/N` errors land on row N with the existing mapping.
  - Remove shows when there are two or more rows, or any price is in effect. So "Add at least one price." can only come from the action or the API.
  - Rows keep the typed date and time on a zone change, as the schedule does; the row then counts as changed.
  - The storefront sells only in `COURSE_CURRENCY`, so rows have no currency; a changed row is sent in it.
  - The action trusts the loaded prices the browser sends back, as it does the status; the API refuses any change to a price in effect.
  - Test fixtures need a future price at a fixed far date (the shared fixture's only price is already in effect).
  - Reuse: `utcToWallClock` (via the prefill's stored-time helper), `formatMoment`, `priceRowLabels`, `priceRowNames`, `PriceRow`, `PricingSection`, `PriceSchedule`, `priceSummary`, `TimeZoneField`'s `recheck`, `fieldErrorsFromProblem`.
  - Flow:

```
Admin opens the edit page
├── prices split: in effect / future, at render           4c
├── in-effect list, latest "current price"                4d
└── future prices become rows (cents → dollars)           4c, shown 4d
Admin edits, adds or removes a row; changes the zone      4d (props 4b)
Admin clicks Save changes
└── per-course schema checks the rows                     4c (rules 4a)
    ├── half-filled / daylight-saving                     existing, 4a
    ├── same amount, time = loaded minus seconds → may be past  4a
    ├── changed, < 1 minute ahead → "Choose a time …"     4a
    ├── two rows same time → "Two prices can't …"         4a
    ├── no rows, none in effect → "Add at least one price." 4c
    │   (form kept, no request; listed in the error list  4c)
    └── fine → action re-checks; PUT rows (untouched as loaded,
        empty start now + 1 minute), then in-effect as loaded   4c
        ├── API 400 /prices/N → message on row N, form kept     existing (2d)
        └── success → home page                                 existing
```

  - Page sketch (Pricing section, after 4d):

```
Pricing — What students pay, in US dollars, and when each price starts.
Enter 0 for a free course.
Leave the date and time empty to start when you save.
  Prices in effect (America/New_York)          [absent when none]
    $79 from Oct 15, 2026, 2:31 PM
    $99 from Oct 20, 2026, 9:00 AM (current price)
  Price  [$ 129.00]  Price start date [2027-01-01]  Price start time [09:00]  [Remove]
  [Add price]
  Price schedule (America/New_York)            [absent until a row has input]
    I. $129 from Jan 1, 2027, 9:00 AM
```

## Step 5. Image upload on edit

- Why here: publishing needs an image (step 6).
- Needs: 2.
- Builds on: [use-save-new-course.ts](../web/src/features/admin-courses/create-course/use-save-new-course.ts) (create's draft-then-image save), [image/](../web/src/features/admin-courses/image/), `uploadCourseImageAction`, the API's `uploadCourseImage` and `getCourseImageAsAdmin` ([openapi-v1.yaml](../api/openapi/openapi-v1.yaml)), [courses.md](courses.md) *Course images*.
- Size: 5 commits (5a–5c share create's image input and save logic; 5d the save; 5e the screen). The map said 2 to 3; sharing with create needs two mechanical commits on create's side.
- Risk: none.
- Done when: a course with no image gets one in `dev:mock`; the image is not in the PUT body; saving without touching the image sends no upload.
- Design notes *(temporary)*:
  - Create's save is "details, then image", and edit follows it through one shared hook. A refused details step sends no image; an image refusal says the details were saved.
  - Shared with create: the image input, the preview slot, the save hook with its messages, the image schema and the upload action.
  - Separate on purpose: form types and schemas (image required on create, optional on edit), the details step (create's draft create-or-update against edit's `PUT`), and the stored image with its route.
  - The stored image is a plain `<img>` with the route as its source. After a replace the page reloads on `/`, so no cache-busting address is needed.
  - For step 6: publishing goes after the upload, as on create, so the API's "needs an image" rule holds.
  - Not in this step: sharing the whole basics section (the sections differ only in placeholder text and the stored-image preview).
  - Flow:

```
Admin opens the edit page
└── stored image shown, or "No image yet"            5e (route 5b)
Admin chooses a file (optional)
├── fails browser check → message, no request        5d
└── preview replaces the stored image                5e (slot 5a)
Admin clicks Save changes
├── form checks fail → errors, no request            existing
└── PUT the details                                  5d (hook 5c)
    ├── refused → API message + field errors, no upload   5c, 5d
    └── saved
        ├── no file → home page                      5d
        └── upload the image                         5c
            ├── refused → "details were saved, but the image didn't upload" + error on the picker; form kept   5c, 5d
            └── stored → home page                   5c
Next click on Save changes → both again              5c
```

  - Page sketch (after 5e):

```
Edit course
Change the course details. Status can't be changed here yet.
[error list: hidden until a save is refused]
Basics — What students see when they browse for the course.
  Image  [Choose file]  JPEG, PNG or WebP, up to 5 MB, at least 800 × 450.
         [16:9: chosen file, else stored image, else "No image yet. …"]
  Course name … Summary … Description
Course material … Schedule … Pricing
[Save changes]
```

## Step 6. Status on edit

- Why here: the publish warning needs to know whether an image exists.
- Needs: 5.
- Size: 3 commits.
- Risk: none.
- Done when: the page warns before publishing without an image, `deleted` asks for confirmation (shadcn alert-dialog), and the owner has used the page in `dev:mock`.

## Out of scope

- The admin course list and navigation to the edit page.
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
