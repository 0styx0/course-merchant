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
- [ ] **3. Schedule rules on edit.** An unchanged start or end time may be in the past; a changed one must be in the future; end is after start. **Next** (not yet split into commits)
- [ ] **4. Prices on edit.** Prices in effect are read-only; future prices can be edited, added and removed.
- [ ] **5. Image upload on edit.** The page shows the current image and uploads a new one in its own step.
- [ ] **6. Status on edit.** Published, drafted, archived and deleted, with a warning before publishing without an image and a confirmation before deleting.

## Principles

- **The page is `app/admin/(signed-in)/courses/[courseId]/edit`.** Admins reach it by URL; the admin course list is out of scope.
- **Compose, don't branch.** Create and edit are two components built from shared blocks. A shared block takes what differs as props or children, never a `mode` flag.
- **Create and edit share no form type and no state.** Each owns its `useForm`, resolver, defaults and value type. Shared blocks are generic and take field names from the parent.
- **Save is a full PUT.** Every field, every time. Strip what the API rejects: the course id, `enrollments`, `status.changedAt` (send status as a plain string) and each price's id.
- **A failed save changes nothing,** so the form stays as it is and shows the errors. Errors can arrive in two rounds: a format error hides the state errors (past times, schedule) until fixed, so expect a second 400.
- **The "must be in the future" check applies only to a changed time,** for the schedule and for price times alike. An unchanged time is sent as the original UTC string.
- **The browser checks help the admin; the API decides.** Same as the create page.
- **After saving, the admin goes to `/`,** as on the create page.
- **Until the web login lands,** admin calls carry no token, so against the real API the page shows a 401. Tests and `yarn dev:mock` use MSW.
- **Every library mentioned links to its docs.**

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Create and edit are two separate form components, composed from shared sections, fields and hooks | Follows the owner's rule to compose rather than branch. No `mode` prop, and each page holds only its own rules (revisit after use) | One form with a `mode` prop (conditionals everywhere); a fully separate copy (drifts) |
| An unchanged schedule or price time is sent as the original UTC string, not converted back from the wall-clock value | Converting back can shift a time in a DST-ambiguous hour, which the API would see as a change and refuse if it is in the past | Always converting back from the wall clock (simpler, but breaks the unchanged-past case) |
| Unchanged and in-effect prices are sent back as loaded | The API keeps exact matches and their ids, so the page tracks no ids | Leaving them out (also safe, but the form would hold less than the API) |
| Shared blocks are generic over the form's own value type and take field names from the parent. Sections are layout with the fields as children. There is no shared value type and no cast | Create's form has an extra field, the image, that edit's doesn't. If both pages shared one form type, edit would have to carry a field it never uses, or the code would need a trick that switches off TypeScript's checking (confirmed with `tsc`). Instead each page keeps its own form type, and the shared pieces work with whichever fields the page gives them. An earlier attempt failed because field names were written inside the shared pieces, not because sharing was impossible (an architect review re-tested it). The compiler can't check a field name inside a shared piece, so the page passes the names in. They are expected to match between create and edit; this setup exists to avoid the trick, not to allow different names | A shared `CourseFormValues` with one cast, `savedFieldsForm` (leaks create's extra field into the shared code); `FormProvider` and `useFormContext` (moves the unchecked step into the library; blocks can't render alone); image outside the form (changes create's validation) |
| Until steps 3, 4 and 6, the edit form holds only name, summary, description, content link and time zone. Start and end times, prices and status go back in the PUT exactly as loaded (the "fields sent back unchanged") | Their boxes need edit's own rules (an unchanged time sent as the original UTC string, in-effect prices read-only), which are steps 3 and 4. Carrying them makes every course savable now, started ones included | Boxes now with no browser time checks (gives a whole form at once; costs most of 3 and 4 pulled forward, or 400s from the API on unchanged past times; high complexity); re-reading the course in the action and merging (gives fresh values; costs a GET per save and is thrown away once those fields move into the form; medium) |
| On edit, changing the time zone keeps the start and end moments, and the schedule line shows them in the new zone (revisit after use) | The kept times are sent unchanged, so they can't move; the line shows what the change means | Keeping the wall-clock time and moving the moments (gives "9 AM stays 9 AM"; costs changed times, which need step 3's past-time rules; medium) |
| The browser gets the form's values and the fields sent back unchanged, never the whole `AdminCourse` | Its `enrollments` hold customers' emails and payment details, and a client component's props are sent to the browser | Passing `AdminCourse` to the form (simpler props; leaks customer data into the page) |
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
- Size: 2 to 3 commits.
- Risk: turning the loaded UTC start and end into date and time boxes in the chosen zone, and a DST-ambiguous hour; reuse [wall-clock-time.ts](../web/src/features/admin-courses/schedule/wall-clock-time.ts), no new date library.
- Done when: tests cover a started course saved with unchanged times, a changed past time refused, end not after start refused, and a DST-ambiguous time.
- Can wait: once the boxes exist, does changing only the time zone keep the moments (the boxes re-display them, as in step 2) or keep the wall clock (the moments move)? See the step 2 decision row.

## Step 4. Prices on edit

- Why here: same unchanged-time rule as step 3, applied to price times.
- Needs: 2.
- Size: 3 to 4 commits.
- Risk: turning stored cents into dollar boxes; otherwise none beyond step 3's.
- Done when: tests cover in-effect prices read-only, a new or edited price in the past refused, duplicate times refused, at least one price required only when none is in effect; the owner has used the page.
- Can wait: whether the duplicate-time rule already exists in [course-form-cross-field-issues.ts](../web/src/features/admin-courses/validation/course-form-cross-field-issues.ts).

## Step 5. Image upload on edit

- Why here: publishing needs an image (step 6).
- Needs: 2.
- Size: 2 to 3 commits.
- Risk: none.
- Done when: a course with no image gets one in `dev:mock`, and the image is not in the PUT body.

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
