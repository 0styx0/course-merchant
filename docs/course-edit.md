# Course edit (admin web page)

Read this before working on the admin "edit course" page. It records what the code can't tell you: progress, intent, why. The create page it shares building blocks with is in [course-creation.md](course-creation.md); how updates behave in the API is in [courses.md](courses.md) *Editing a course*; endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) (`getCourseAsAdmin`, `updateCourse`, `uploadCourseImage`). Run it with `/plan-create-implementation course-edit`, then `/next-commit course-edit`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes **Next**.

- [ ] **1. Create form rebuilt from shared building blocks.** Create behaves the same, but `CourseForm` becomes a composition of shared sections, fields and hooks, with no `mode` prop and no create/edit conditionals.
  - [x] **1a.** Form files grouped by job (`sections/`, `problems/`, `hooks/`, `create-course/`), `CourseForm` renamed `CreateCourseForm`, hooks file split.
  - [ ] **1b.** Shared blocks take a form typed on the saved fields; the image becomes create's own. **Next**
    - *Files*:
      - New `course-form/saved-fields-form.ts`:
        - `savedFieldsForm(form)` is the one commented cast.
        - A type-level check beside it fails the build if `CourseFormWithImageValues` stops including `CourseFormValues`.
      - The fields, schedule fields, schedule problems, sections and `price/price-row.tsx` change their `form` prop to `UseFormReturn<CourseFormValues>`.
      - `BasicsSection` takes a `children` slot, rendered first, for the image.
      - New `create-course/course-image-input.tsx` holds the image `Controller`, moved out of the sections.
      - `create-course-form.tsx` passes `savedFieldsForm(form)` and the image input as the Basics child.
    - *Behaviours*:
      - Field errors, counters, the schedule error list and the image error behave unchanged; the existing tests pin this.
    - *Needs*: 1a.
    - *Settled*: the decision row on the shared form type.
    - *Done when*:
      - Existing tests unchanged and green.
      - `tsc`, `knip` and lint are clean.
      - The Playwright create spec passes.
      - The page has been run in `dev:mock`.
- [ ] **2. Edit page loads and saves the details.** A separate edit form prefills name, summary, description, content link and time zone, saves with a full PUT, and goes to `/`.
- [ ] **3. Schedule rules on edit.** An unchanged start or end time may be in the past; a changed one must be in the future; end is after start.
- [ ] **4. Prices on edit.** Prices in effect are read-only; future prices can be edited, added and removed.
- [ ] **5. Image upload on edit.** The page shows the current image and uploads a new one in its own step.
- [ ] **6. Status on edit.** Published, drafted, archived and deleted, with a warning before publishing without an image and a confirmation before deleting.

## Principles

- **The page is `app/admin/(signed-in)/courses/[courseId]/edit`.** Admins reach it by URL; the admin course list is out of scope.
- **Compose, don't branch.** Create and edit are two components built from shared blocks. A shared block takes what differs as props or children, never a `mode` flag.
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
| Shared form blocks take `UseFormReturn<CourseFormValues>`. The create form hands its form in through one commented cast, `savedFieldsForm`, guarded by a type-level check | React Hook Form's types won't accept a form with `image` where one without is expected (checked with `tsc`). One cast with a build-time check keeps the compiler guarding the step | `FormProvider` and `useFormContext` (moves the unchecked step into the library; blocks can't render alone without a provider; 5 files rewritten); generic blocks (field names fail to type-check); image outside the form (changes create's validation) |
| The delete confirmation uses shadcn alert-dialog | Matches the existing shadcn/base-ui setup | An inline confirmation step |

## Step 1. Create form rebuilt from shared building blocks

- Why here: edit needs the same sections and fields; extracting them first means milestone 2 composes instead of forking or adding a `mode` prop.
- Needs: none.
- Builds on: [course-form/](../web/src/features/admin-courses/course-form/) (sections, fields, hooks, `use-save-course.ts`), [course-form.tsx](../web/src/features/admin-courses/course-form/course-form.tsx), [CLAUDE.md](../CLAUDE.md) *Conventions* (files per folder, folder grouping, diagram of file moves).
- Size: 2 commits (group files by job; shared blocks typed on the saved fields). 1a is mechanical.
- Risk: low; behaviour must not change.
- Done when: the create form tests and the Playwright `create-course.spec.ts` pass unchanged; the folder-count command prints nothing; a before/after diagram of each changed folder is shown.
- Design notes *(temporary)*:
  - The summary props on `ScheduleSection` and `PricingSection` stay as they are.
  - These stay in create until milestone 2 needs them:
    - `focusField`;
    - the defaults and the resolver;
    - the save button label.
  - `use-save-course.ts` is create-only: its draft-then-image flow doesn't apply to edit.

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
