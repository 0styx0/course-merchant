# Course edit (admin web page)

Read this before working on the admin "edit course" page. It records what the code can't tell you: progress, intent, why. The create page it shares building blocks with is in [course-creation.md](course-creation.md); how updates behave in the API is in [courses.md](courses.md) *Editing a course*; endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) (`getCourseAsAdmin`, `updateCourse`, `uploadCourseImage`). Run it with `/plan-create-implementation course-edit`, then `/next-commit course-edit`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes **Next**.

- [ ] **1. Create form rebuilt from shared building blocks.** Create behaves the same, but `CourseForm` becomes a composition of shared sections, fields and hooks, with no `mode` prop and no create/edit conditionals.
  - [x] **1a.** Form files grouped by job (`sections/`, `problems/`, `hooks/`, `create-course/`), `CourseForm` renamed `CreateCourseForm`, hooks file split.
  - [x] **1b.** Fields and error readers are generic over the form's type; `TimeZoneField` takes its name and the paths to re-check, with a test for the re-check.
  - [ ] **1c.** Schedule blocks take their names from the parent, and `ScheduleSection` becomes layout. **Next**
    - *Files*:
      - [course-form-schedule-fields.tsx](../web/src/features/admin-courses/course-form/sections/course-form-schedule-fields.tsx) (four names)
      - [schedule-problems.tsx](../web/src/features/admin-courses/course-form/sections/schedule-problems.tsx) (two time names)
      - [course-form-sections.tsx](../web/src/features/admin-courses/course-form/sections/course-form-sections.tsx) (`ScheduleSection` takes children and `scheduleText`)
      - `create-course/create-course-sections.tsx` (new; create's filled sections, so the form file stays short)
      - [create-course-form.tsx](../web/src/features/admin-courses/create-course/create-course-form.tsx)
    - *Behaviours*:
      - A date change marks the field touched.
      - A date change checks again only the siblings the admin has reached (existing schedule-validation tests).
      - The end date's `min` follows the start date.
      - Cross-field messages show in the shared line.
    - *Settled*: try `FieldPathByValue<T, string>` names for `setValue` first; if `tsc` still refuses, one commented cast for the library's type limit, and a clause added to the "no cast" decision row.
  - [ ] **1d.** Price rows take their names from the parent, and `PricingSection` becomes layout.
    - *Files*:
      - [price-row.tsx](../web/src/features/admin-courses/price/price-row.tsx) (the row's three names)
      - `price/price-row-labels.ts` (new; `priceRowLabels` moves here from `course-form/problems`)
      - [course-form-sections.tsx](../web/src/features/admin-courses/course-form/sections/course-form-sections.tsx) (`PricingSection` takes rows as children, `onAddPrice` and the summary)
      - `create-course/create-course-sections.tsx` (removes a row, then checks again; `emptyPrice` moves here)
      - [course-form.price-rows.test.tsx](../web/src/features/admin-courses/create-course/tests/course-form.price-rows.test.tsx) (coverage first)
    - *Behaviours*:
      - "Add price" appends an empty row.
      - New test: removing a duplicate-time row clears the "same time" error.
      - With one row, there is no Remove button and the label reads "Price".
  - [ ] **1e.** Basics and Course material become layout, and the image becomes create's own child.
    - *Files*:
      - [course-form-sections.tsx](../web/src/features/admin-courses/course-form/sections/course-form-sections.tsx) (`ImageInput` leaves this file)
      - `create-course/create-course-sections.tsx` (image, name, summary, description, content link)
    - *Behaviours*:
      - Field order, labels and counters are unchanged (existing fields and image-upload tests).
  - [ ] **1f.** The error list takes its fields from the form.
    - *Files*:
      - [course-form-problems.ts](../web/src/features/admin-courses/course-form/problems/course-form-problems.ts) and its `.test.ts` (`courseFormProblems(errors, fields)`)
      - `create-course/create-course-fields.ts` (new; one ordered `[name, label]` list, plus `priceRowNames(index)`)
      - `create-course/create-course-sections.tsx` and [create-course-form.tsx](../web/src/features/admin-courses/create-course/create-course-form.tsx) read labels from that list
    - *Behaviours*:
      - Order and labels are unchanged, with the image first (existing problem-list test).
      - The description counts as one field, however many errors it has.
      - The unit test passes its own field list.
    - *Done when*:
      - `grep -rnE 'CourseFormWithImageValues|"(image|name|summary|contentUrl|schedule\.|prices)' web/src/features/admin-courses/{course-form,price}` prints nothing.
      - The create tests and Playwright `create-course.spec.ts` pass.
      - The folder-count script prints nothing.
      - A before/after diagram of each changed folder is shown.
- [ ] **2. Edit page loads and saves the details.** A separate edit form prefills name, summary, description, content link and time zone, saves with a full PUT, and goes to `/`.
- [ ] **3. Schedule rules on edit.** An unchanged start or end time may be in the past; a changed one must be in the future; end is after start.
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
| Shared blocks are generic over the form's own value type and take field names from the parent. Sections are layout with the fields as children. There is no shared value type and no cast | A form's setters and subscriptions are contravariant, so a form with extra fields never fits a shared type (checked with `tsc`); generics avoid the cast. The earlier failure was hard-coded names inside generic blocks, not generics themselves (an architect review re-tested it) | A shared `CourseFormValues` with one cast, `savedFieldsForm` (leaks create's extra field into the shared code); `FormProvider` and `useFormContext` (moves the unchecked step into the library; blocks can't render alone); image outside the form (changes create's validation) |
| The delete confirmation uses shadcn alert-dialog | Matches the existing shadcn/base-ui setup | An inline confirmation step |

## Step 1. Create form rebuilt from shared building blocks

- Why here: edit needs the same sections and fields; extracting them first means milestone 2 composes instead of forking or adding a `mode` prop.
- Needs: none.
- Builds on: [course-form/](../web/src/features/admin-courses/course-form/) (sections, fields, hooks, `use-save-course.ts`), [course-form.tsx](../web/src/features/admin-courses/course-form/course-form.tsx), [CLAUDE.md](../CLAUDE.md) *Conventions* (files per folder, folder grouping, diagram of file moves).
- Size: 6 commits (1a mechanical; 1b–1f one shared area each: fields, schedule, prices, basics, error list).
- Risk: low; behaviour must not change.
- Done when: the create form tests and the Playwright `create-course.spec.ts` pass unchanged; the folder-count command prints nothing; a before/after diagram of each changed folder is shown.
- Design notes *(temporary)*:
  - The summary props on `ScheduleSection` and `PricingSection` stay as they are.
  - These stay in create until milestone 2 needs them:
    - `focusField`;
    - the defaults and the resolver;
    - the save button label.
  - `use-save-course.ts` is create-only: its draft-then-image flow doesn't apply to edit.
  - The shared form type is a `Pick` of the members the blocks use (`register`, `formState`, `control`, `trigger`, `getFieldState`, `setValue`, `watch`). It avoids `handleSubmit`, which a form with other fields can't fit. A `tsc` probe on 2026-10-30 accepted create's form with no cast.
  - Create's own pieces live in `create-course/`: its defaults, `emptyPrice`, its field list and its row names. Edit will own its versions.
  - Folder counts: `create-course/` 3 files → 5 (plus `tests/`); `price/` 4 → 5; `course-form/sections/` stays 4.

## Step 2. Edit page loads and saves the details

- Why here: the thinnest end-to-end path (load, prefill, save).
- Needs: 1.
- Size: 3 to 4 commits.
- Risk: converting a stored course (UTC instants, cents, description JSON) into form values.
- Done when: in `dev:mock`, the owner edits a not-yet-started course's name and saves; an API 400, then a second 400, show as errors and keep the form; the owner has used the page.

## Step 3. Schedule rules on edit

- Why here: a course that has started can't be saved until an unchanged past time is allowed.
- Needs: 2.
- Size: 2 to 3 commits.
- Risk: a DST-ambiguous hour; reuse [wall-clock-time.ts](../web/src/features/admin-courses/schedule/wall-clock-time.ts), no new date library.
- Done when: tests cover a started course saved with unchanged times, a changed past time refused, end not after start refused, and a DST-ambiguous time.

## Step 4. Prices on edit

- Why here: same unchanged-time rule as step 3, applied to price times.
- Needs: 2.
- Size: 3 to 4 commits.
- Risk: none beyond step 3's.
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
