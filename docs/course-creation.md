# Course creation (admin web page)

Read this before working on the admin "create course" page and the rich-text description it needs. Run it with `/next-commit course-creation`. It records progress, the design of each step, and why each choice was made. Page behaviour is specified in [web/docs/admin.md](../web/docs/admin.md) (*Creating courses*); endpoints and shapes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml); how courses behave is in [courses.md](courses.md); how the web app is built is in [web.md](web.md).

Keep this file current **in the same commit as the work**. Tick the step, mark the next one **Next**, add a decision row for anything decided, and when a step ships, cut its notes down to decision rows.

## Status

Each step is one commit, outlined in detail before it starts. Every step's tests are part of the step.

- [x] **1a. Description renderer** (web only, not used by a page yet).
- [x] **1b-i. Description validator** (API only, not wired in).
- [x] **1b-ii. Store and show the document** (contract, database, API, course page).
- [ ] **2. Server side of the create form** (no page yet), in six commits, in this order (each uses the ones before it; details in *Step 2* below):
  - [x] **2a. Description helpers** (`feat(courses)`).
  - [ ] **2b. Form limits and the contract test** (`feat(admin-courses)`). **Next**
  - [ ] **2c. Wall-clock time to UTC** (`feat(admin-courses)`).
  - [ ] **2d. The form schema** (`feat(admin-courses)`).
  - [ ] **2e. The request builder** (`feat(admin-courses)`).
  - [ ] **2f. API wrappers, error mapping, the Server Action and MSW handler** (`feat(admin-courses)`). Ticking this also ticks step 2, marks step 3 **Next** and cuts the *Step 2* notes down to decision rows.
- [ ] **3. The create form page.**
- [ ] **4. Description toolbar, list depth and Google Docs paste tests.**
- [ ] **5. Image and publish in the create form.**

Not part of this work: admin login and logout, the admin course page and list, editing a course (loading a stored document into the editor is `setContent`, no conversion), the payout estimate under the price (payments step 7), a Playwright test comparing the image preview with the saved image, and plain-text or email versions of the description (the static renderer can produce Markdown later).

## Principles

- **Only the create page.** Until the web login lands, admin API calls carry no token, so against the real API they return a 401, which the page shows as a problem message. Tests and `yarn dev:mock` use MSW, which ignores logins. When the login lands it adds `requireAdminSession()` and the token to every wrapper and action here.
- **After saving, the admin goes to the home page (`/`).** A new course is a draft, so it isn't listed there, and the page is cached for a minute, so it shows no "saved" message.
- **The page needs JavaScript.** [react-hook-form](https://react-hook-form.com) holds the form state. Server Actions are called as plain async functions with typed values: no `useActionState`, no `FormData` reading except for the image file.
- **A field is first checked when it loses focus,** then on every keystroke (`mode: "onTouched"`).
- **Prices are a schedule:** one or more rows, each an amount and the time it takes effect. $0 (free) is allowed, as the API allows; otherwise at least $0.50.
- **The browser checks help the admin; the API decides.** "In the future" depends on the server's clock, and the currency list comes from the server's settings.
- **Every library mentioned links to its docs.**

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| The description is written in a [Tiptap](https://tiptap.dev) visual editor and stored as a contract-defined subset of Tiptap's JSON (`jsonb`), validated strictly by the API and shown with Tiptap's [static renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer) | Pasting from Google Docs keeps bold, italic, headings, lists and links, and the admin never sees syntax. What the editor shows is what is stored and rendered: no conversion. The API decides what formatting exists. No HTML string ever reaches the page. The project is in development, so no data to migrate | A Markdown textarea (pasting loses formatting; syntax confuses non-technical writers); Tiptap saving Markdown (two parsers between editor and page that can disagree, and the counter would count `**` and link addresses); HTML plus [DOMPurify](https://github.com/cure53/DOMPurify) (the API has no DOM to clean it with); [Lexical](https://lexical.dev) (before 1.0, more verbose JSON); a hand-written renderer (Tiptap ships one) |
| The renderer is the static renderer's `pm/react` variant (`renderToReactElement` from `@tiptap/static-renderer/pm/react`) with the shared extension list, so its output follows the editor's configuration without us mapping each node and mark | Less code of ours, and the editor and page can't drift apart. The `unhandledNode` and `unhandledMark` options show an unknown type's text instead of throwing (without them it throws, e.g. `Unknown node type`). Tiptap's `isAllowedUri` and renderer neutralise `javascript:` links (empty `href`) | The JSON variant with a hand-written mapping (about 25 lines: heading offset, link check, fallbacks) |
| `CourseDescription` is a shared component: no `"use client"`, no `server-only`, no hooks. The course page renders it on the server | Visitors download no renderer code and the browser does no work for it, yet a later client preview can import it. Lock it to one side only when a real need appears | `server-only` (blocks a client preview); `"use client"` (renderer code in the page's JavaScript) |
| `@tiptap/core` is a direct dependency, all `@tiptap/*` pinned to one exact version | `JSONContent` and the tests' headless `Editor` come from it, and the renderer needs it as a peer; transitive-only imports are against the rules | Importing it through `starter-kit` |
| The description's CSS is a hand-written `.description-content` class in [globals.css](../web/src/app/globals.css) | About eight elements to style, and the editor sets the class as a plain string in step 3 | [@tailwindcss/typography](https://github.com/tailwindlabs/tailwindcss-typography) (a dependency styling far more); a CSS module |
| The API checks the description with the editor's own schema (`getSchema` and `nodeFromJSON().check()` from `@tiptap/core`) plus one pass over the text, instead of hand-written Zod for every node, mark and list level | Far less code, and what the editor can make and what the API accepts can't drift on node and mark shape. A subagent review found the hand-mirrored Zod and OpenAPI tree more than a small storefront needs. Both calls are public API. Costs: the API depends on Tiptap; the generated TypeScript type of the description is a loose object; a refused structure is reported at `/description`, not at the exact node (the text pass does give exact pointers) | Strict Zod unions for each node and level (typed contract, exact pointers, but two descriptions of the document to keep in step); Markdown or sanitised HTML strings (see the first row) |
| The API keeps a byte-identical copy of the web's [description-extensions.ts](../web/src/features/courses/description-extensions.ts), and a unit test fails if they differ | The packages aren't a workspace, and a shared package would restructure the repo for one 15-line file | A workspace package; importing the web's file from the API |
| The API stores the editor schema's normalised JSON, and extra attributes are dropped rather than refused | Comparing `toJSON()` with the request would refuse valid documents, since it adds default attributes (`link.target`, `rel`, `class`, `orderedList.start`). Unknown attributes are harmless once dropped, and the stored document is exactly what the renderer and editor understand | Refusing unknown attributes by comparison |
| Link schemes are `https:`, `http:`, `mailto:` and `tel:` | Chosen by the owner; an explicit list is easier to state and test than Tiptap's defaults | Tiptap's default list; `https`, `http` and `mailto` only |
| The column is `Jsonb` (Postgres `jsonb`), and the generic JSON type is cast to the contract's document type in one place, `storedDescription` in [courses.mapper.ts](../api/src/courses/courses.mapper.ts) (and `toStoredDescription` for writes) | Prisma 8's bare `Json` is plain `json`, which keeps raw text. Only validated documents are written, so the cast is safe, and two call sites beat casting in every repository finder. The generated type has an index signature, which Prisma's `JsonValue` refuses, so a write needs the cast too. The migration is a destructive `text → jsonb` change, and the databases were recreated | Casting in each repository finder (about six call sites) |
| The course page shows the summary under the name and the description below the header | The description is now a block of headings and lists, which doesn't belong in a header. The summary is already the page's meta description and the card text | Showing no summary on the course page |
| Not enforced by the API: list depth, blockquotes and rules inside lists, empty paragraphs, `maxItems` | Owner's call: the API checks security and basic correctness, the 100 KB body limit bounds size, and the editor is the only writer. Step 4's Tab override still stops deep lists in the editor. The web's `toCourseDescription` still strips empty paragraphs | Walking the tree for each rule (about 40 more lines and tests) |
| Headings are levels 2-4 in the extension list, and the contract (1b) uses the same levels | The course name is the page's `<h1>`, so the editor never makes another; Tiptap's own output is then correct with no heading mapping. A pasted level 1 becomes a paragraph | Levels 1-3 with a renderer that shifts them down; allowing levels 1-6 |
| Blockquotes, horizontal rules, strikethrough and underline are allowed; code and code blocks are not | The owner wants them; each is one Tiptap extension and styled by `.description-content`. Code stays off: nothing in a course description needs it. Underlined text looks like a link, so the toolbar (step 4) should label underline clearly | Leaving them out (first plan) |
| Links open in the same tab (`HTMLAttributes: { target: null }`), and `rel="noopener noreferrer nofollow"` stays | A new window is an unannounced change of context (WCAG G201 advises warning the reader), and a writer can't add that warning to their own link text | Tiptap's default `target="_blank"` |
| No `class` attribute on links in the contract | Nothing sets it. Stored CSS names tie old content to today's styles, Tailwind can't see names that live only in the database, and a free-text class could reuse utility classes (`fixed inset-0 z-50`) to cover the page. If button-style links are ever wanted, store a named option (`variant: "button"`) | A `class` field; an allow-list of class names |
| The toolbar is built by hand from Base UI's [Toolbar](https://base-ui.com/react/components/toolbar) with shadcn `toggle` styling | About seven buttons, each one Tiptap command. [Tiptap UI Components](https://tiptap.dev/docs/ui-components/getting-started/overview) are best supported on React 18 / Next 15 (this repo is React 19 / Next 16) and bring a second set of button styles | Tiptap UI Components |
| No empty paragraphs in the stored document; `toCourseDescription` strips them and the API refuses them | Blank lines from Docs and the editor's trailing empty line show as blank space in the editor but take no height on the page. Spacing between paragraphs comes from CSS | Keeping them and giving them a line of height |
| Tab stops indenting at list level 3 (small ListItem keyboard override) | Lists nest at most 3 levels in the contract; stopping Tab avoids an error the writer can only fix by guessing. Deeper pasted lists get a message naming Shift+Tab | An error message only |
| One web form schema, no Zod shared with the API, plus a contract test | The API's validators load server settings and NestJS ([allowed-currencies.ts](../api/src/courses/allowed-currencies.ts) reads `process.env`, [error-codes.ts](../api/src/common/errors/error-codes.ts) imports `@nestjs/common`), the packages aren't a workspace, and the form's values differ from the request. The request builder is type-checked against the generated `CreateCourseRequest`; the contract test compares the form's limits with [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) | Sharing the API's schemas |
| Admin forms use react-hook-form and call Server Actions as functions; public forms are free to use `useActionState` | Per-field touched/valid state, `useFieldArray` for price rows and `setError` for server errors, with typed values and no `FormData` parsing. The page needs JavaScript anyway | [Conform](https://conform.guide) (its advantage, working without JavaScript, doesn't apply here); `useActionState` for this page |
| An empty "takes effect" becomes now + 1 minute | The API refuses times in the past, and "now" is already past when the API checks it. Cost: a course published later can show up to a minute after its price's start | Sending "now" |
| After a refused submit, focus moves to the error list | Screen readers read every problem; each link jumps to its field | Focusing the first invalid field |
| [temporal-polyfill](https://github.com/fullcalendar/temporal-polyfill) for wall-clock time to UTC | Correct across daylight-saving changes, with `disambiguation: "reject"` for skipped or repeated times. About a third of the size of [@js-temporal/polyfill](https://github.com/js-temporal/temporal-polyfill) | `@js-temporal/polyfill`; hand-written offset maths |
| Native `datetime-local`, `<select>` and file inputs | They already do the job | Date pickers, a time zone combobox, [react-dropzone](https://react-dropzone.js.org), [next-safe-action](https://next-safe-action.dev) |

## Libraries to add (web only)

| Package | Why |
|---|---|
| [react-hook-form](https://react-hook-form.com) | Form state, checks on blur, price rows, server errors |
| [Zod](https://zod.dev) (v4, same major as the API) and [@hookform/resolvers](https://github.com/react-hook-form/resolvers) | One form schema, run in the browser and again in the Server Actions |
| [temporal-polyfill](https://github.com/fullcalendar/temporal-polyfill) | Time zone conversion |
| [@tiptap/react](https://tiptap.dev/docs/editor/getting-started/install/react), [@tiptap/pm](https://tiptap.dev/docs/editor/getting-started/install/react), [@tiptap/starter-kit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) | The editor. About 100 KB compressed (estimate), admin page only. Pin every `@tiptap/*` package to one version |
| [@tiptap/static-renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer) | Renders the stored document as React elements on the server |
| [yaml](https://eemeli.org/yaml/) (dev) | The contract test reads the OpenAPI file; `js-yaml` is only installed through another package |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) (dev) | Real typing, tabbing and blurring in component tests |
| [shadcn/ui](https://ui.shadcn.com/docs/components) `field`, `input`, `textarea`, `label`, `checkbox`, `toggle` | Same look as the existing `button`. [`field`](https://ui.shadcn.com/docs/components/field) supplies label, description and error markup. Check they install for the `base-nova` style |

Each library is added by the step that first uses it.

## The description document

What the contract allows is what the editor's own schema allows (a subset of Tiptap's JSON, so the editor and the static renderer read it as is): `doc` → blocks (`paragraph`, `heading` levels 2-4, `bulletList`, `orderedList`, `blockquote`, `horizontalRule`), text with the marks `bold`, `italic`, `strike`, `underline` and `link`, and `hardBreak`. The API builds that schema from a copy of [description-extensions.ts](../api/src/courses/validation/description-extensions.ts) and loads the request through it (`nodeFromJSON().check()`), so unknown nodes and marks, wrong nesting and duplicate marks are refused without us listing them.

On top of that, one pass over the text enforces what ProseMirror can't know:

- **Text is storable:** no U+0000 and no unpaired surrogate in any `text` or link `href`, because Postgres `jsonb` refuses both and would otherwise cause a 500.
- **Links:** `href` at most 2,048 characters and a scheme of `https:`, `http:`, `mailto:` or `tel:` (`new URL()` also catches `JAVASCRIPT:`, leading spaces and `java\tscript:`).
- **Text limit:** at least one non-whitespace character (`/\S/u`; spaces, non-breaking spaces or line breaks only count as empty) and at most 5,000 characters in total (the sum of the `text` lengths, counted with `.length` like the other limits). The contract states it in words and as `x-max-text-length: 5000`.
- **Size:** bounded by Express's default 100 KB JSON body limit, which [configure-app.ts](../api/src/configure-app.ts) relies on implicitly; write it down in [courses.md](courses.md).

The API stores the schema's own JSON, not the request: attributes and keys the editor doesn't know are dropped, and the defaults Tiptap fills in (`link.target`, `rel`, `class`) are kept. The web's `toCourseDescription(editorJson)` still sends only the fields it needs.

**Errors** (existing generic codes, pointer into the document):

- no visible text → same code as an empty name, at `/description`;
- over 5,000 characters → `TOO_LONG` at `/description`;
- a refused link or unstorable text → `INVALID_VALUE` at the exact pointer, e.g. `/description/content/2/content/0/marks/0/attrs/href`;
- a document the editor's schema refuses → `INVALID_VALUE` at `/description` (the check reports no path); a body that isn't a document at all → `INVALID_TYPE`.

The form shows every `/description/…` error on the description field and merges them into **one entry** in the error list, so a bad paste can't flood it. The message is chosen from the pointer's ending: `…/attrs/href` → "Links must start with https://, http://, mailto: or tel:"; otherwise a general one.

## Form field names

The form's values are named after the request, so every field is qualified by its owner, and an API error path maps by replacing `/` with `.`:

- `name`, `summary`, `description` (the document), `contentUrl`;
- `schedule.startTime`, `schedule.endTime` (wall-clock `datetime-local` text), `schedule.timeZone`;
- `prices.N.amountDollars` ("79.50"; the API's `amount` is cents), `prices.N.effectiveAt` (wall-clock text, or empty for "when saved");
- `image` and `publishAfterSaving` (step 5; never sent as JSON).

Price rows go to the API in the order shown, so the API's `/prices/0` is the form's first row. Any path under `/description/` maps to `description`.

## Step 2. Server side of the create form (no page yet)

Six commits, each finished, tested and ticked before the next. A library is added by the commit that first uses it: `yaml` (dev) in 2b, `temporal-polyfill` in 2c, `zod` v4 in 2d. `react-hook-form` and `@hookform/resolvers` wait for step 3. Nothing here is global config: limits and the currency constant live in the `admin-courses` feature.

| Commit | Adds | Tests |
|---|---|---|
| 2a `feat(courses): count and tidy rich-text descriptions on the web` | `description-document.ts` and the `CourseDescriptionDocument` type | the description helper tests below |
| 2b `feat(admin-courses): keep the form's limits in step with the API contract` | `course-form-limits.ts`, `yaml` (dev) | the contract test |
| 2c `feat(admin-courses): convert wall-clock times to UTC` | `wall-clock-time.ts`, `temporal-polyfill` | a spring gap, an autumn overlap, a normal time, a bad zone |
| 2d `feat(admin-courses): validate the create-course form` | `course-form-schema.ts`, `zod` | every rule and message, cross-field checks with other fields empty |
| 2e `feat(admin-courses): build the create-course request from the form` | `to-course-request.ts`, the request types | money, "when saved" with fake timers, the request shape |
| 2f `feat(admin-courses): create a course from a Server Action` | `admin-courses.api.ts`, `field-errors-from-problem.ts`, `create-course.action.ts`, the MSW handler and fixture, the remaining types | pointer mapping, the action |

Decided at the outline:

- The "at least a minute from now" rule for a set price time is in the schema and uses the browser's clock; the API has the final say.
- The time zone is checked against `Intl.supportedValuesOf("timeZone")`. The browser and server lists can differ slightly; a zone the server doesn't know is refused with "Choose a time zone." Accepted as rare.
- Dollars to cents is `Math.round(Number(dollars) * 100)`. `Intl.NumberFormat` only formats (cents to "$79.50"), it can't parse, so it is for showing prices later, not for this. The schema's two-decimal check comes first and is the guard: with at most two decimals the rounding only absorbs float noise (`1.1 * 100`). Record this as a decision row only after asking the owner (they asked to be asked before any decision row is added).

**Types** in [types.ts](../web/src/lib/types.ts): `CourseDescriptionDocument` (2a; not `CourseDescription`, the component's name), `CreateCourseRequest` and `UpdateCourseRequest` (2e), `AdminCourse`, `ValidationProblemDetails` and `FieldError` (2f).

**Wrappers** (2f) in `src/features/admin-courses/admin-courses.api.ts`: `createCourse` and `updateCourse`, each returning a `Result` through `toResult()`.

**Limits** (2b):

- `course-form-limits.ts` holds the named constants: name 100, summary 300, description text 5,000, list levels 3, content link 2,048, and the price minimum of 50 cents.
- The contract test, `course-form-limits.test.ts`, reads [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) and compares each constant with the contract:
  - `CourseName`, `CourseSummary` and `CourseContentUrl` `maxLength`;
  - `CourseDescription`'s `x-max-text-length` and `x-max-list-depth`;
  - `ScheduledPrice`'s minimum (under `allOf` → `anyOf`).

**Description helpers** (`src/features/courses/description-document.ts`):

- `toCourseDescription(editorJson)` keeps only the contract's fields and drops empty paragraphs;
- `countDescriptionCharacters(doc)` sums the text lengths, and `hasVisibleText(doc)` applies `/\S/u`: the same rules as the API.

**Schema** (`course-form-schema.ts`): the values as typed, with plain messages.

- Required fields: "Enter a course name." The description is required when it has no visible text.
- Lengths: "The name must be 100 characters or fewer." The summary is trimmed before it is checked, as the contract does. The description uses `countDescriptionCharacters`.
- Description structure: only list depth and link schemes need messages; the editor can't produce other nodes.
- Content link: must be an `http(s)` URL.
- Price amount: "The payment processor needs a price of at least $0.50. Enter 0 for a free course." and "Use at most two decimal places."
- Time zone: "Choose a time zone." from the list.
- Time rules:
  - "The start time must be in the future."
  - "The end time must be after the start time."
  - "Two prices can't take effect at the same time."
  - A set price time must be at least a minute from now, so it can't collide with "when saved".
- Daylight saving: a wall-clock time a daylight-saving change skips or repeats in the chosen zone is refused with a clear message, for example "2:30 AM doesn't exist on that day in America/New_York. Choose another time." (Temporal `disambiguation: "reject"`).
- Every check that compares fields uses Zod's [`when`](https://zod.dev/api#when), so it runs even while unrelated fields are still empty. The API's [course-request-schemas.ts](../api/src/courses/validation/course-request-schemas.ts) does the same.

**Request builder** (`to-course-request.ts`): its result `satisfies CreateCourseRequest`.

- Local time plus zone → UTC `…Z`.
- "79.50" → `7950` with `Math.round(Number(dollars) * 100)`, safe because the schema allows at most two decimals.
- Currency `USD` from one constant.
- An empty "takes effect" → now + 1 minute.
- Also used for updates (step 5), with the status passed in.

**API errors to form fields** (`field-errors-from-problem.ts`):

- The API's JSON Pointers become form paths: `/schedule/startTime` → `schedule.startTime`, `/prices/0/amount` → `prices.0.amountDollars`, and anything under `/description/` → `description`.
- Paths the form doesn't have go to the summary only.

**Action** (`create-course.action.ts`, `"use server"`): `createCourseAction(values)`.

1. Re-checks `values` with the schema, because anyone can call an action with anything.
2. Builds the request with status `drafted`.
3. Calls `createCourse`.
4. Returns `Result<{ courseId }, { problem, fieldErrors: { path, message }[] }>`.

**MSW:** `mocks/handlers/create-course.ts` (`success`, `validationFailed`, `error`), with an `AdminCourse` fixture in `mocks/fixtures/`.

**Tests:**

- each schema rule and its message, including cross-field checks with other fields left empty;
- a time in a daylight-saving gap and one in an overlap;
- dollars to cents;
- "when saved" → now + 1 minute (fake timers);
- `toCourseDescription` drops Tiptap's extra attributes and empty paragraphs; `countDescriptionCharacters`; `hasVisibleText` with spaces, non-breaking spaces and line breaks only;
- the contract test;
- JSON Pointer mapping, including a deep `/description/…` pointer;
- the action with MSW: success, a validation refusal, a non-validation problem, and invalid input refused before any API call.

## Step 3. The create form page

**Page.** `app/admin/(signed-in)/courses/new/page.tsx`, title "New course".

- It builds the time zone list on the server (`Intl.supportedValuesOf("timeZone")`) and passes it in, so the browser and server render the same list.
- The default time zone is `America/New_York`.

**Form** (`course-form.tsx`, client component):

- `useForm({ resolver, mode: "onTouched", shouldFocusError: false })`.
- `useFieldArray` for price rows, with add and remove buttons and at least one row.
- Changing the time zone calls `trigger(["schedule", "prices"])`.
- Changing the start time re-checks the end time.
- Below the times: "Lasts 2 hours 30 minutes" once both are valid, from a small `formatCourseLength` helper. TypeScript has no types for `Intl.DurationFormat` yet.

**Description editor, first version** (`description-editor.tsx`, no toolbar yet):

- `useEditor` with the shared extension list and `immediatelyRender: false` (Tiptap's setting for server-rendered React, avoiding a server/browser mismatch). Loaded with `next/dynamic` so the editor code is only downloaded on this page.
- Connected through react-hook-form's `Controller`: `onUpdate` sets the value through `toCourseDescription`, the editor's blur calls `onBlur`.
- Pasting from Google Docs and the keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, Shift+Enter) already work without a toolbar.
- The editable area gets `id`, `role="textbox"`, `aria-multiline`, `aria-labelledby`, `aria-invalid`, `aria-describedby` and the shared `description-content` class through `editorProps.attributes`.
- Focus: clicking the label focuses the editor (a `<label>` can't focus a contenteditable area on its own); `field.ref({ focus: () => editor?.commands.focus() })` lets react-hook-form and the error-list link focus it.
- Help text under the field: "Paste from Google Docs to keep formatting. In a list, Tab indents; press Esc then Tab to leave the editor." (exact wording and the way out of the editor confirmed at the outline).
- A "1,234 / 5,000" counter from `countDescriptionCharacters` (numbers formatted with `"en-US"`, so the server and browser show the same text): linked through `aria-describedby`, not a live region, so it isn't read out on every keystroke; typing past 5,000 is never blocked, the counter turns red and the field shows the error.

**How a field shows its state** (`components/form/form-field.tsx`, built on shadcn [`field`](https://ui.shadcn.com/docs/components/field)):

- An error shows only once the field has been touched or the form has been submitted. A re-check started by another field doesn't show an error on a field the admin hasn't reached.
- Invalid: red outline, red X icon beside the input, and the message below. The input gets `aria-invalid` and `aria-describedby` pointing at the message.
- Touched and valid: green check.

**Error list at the top** (`components/form/error-summary.tsx`):

- It appears after the first submit attempt, and when the server answers with errors.
- A heading such as "Fix 3 problems before saving".
- One link per problem that jumps to its field (for the description, one entry however many errors it has, focusing the editable area).
- The API's `title`/`detail` when the server refused.
- On a refused submit, focus moves to the list, so screen readers read every problem.
- The list updates as fields are fixed.

**Submitting:**

1. `handleSubmit` checks the form first, so an invalid form never reaches the server.
2. It awaits `createCourseAction(values)`.
3. On success, `router.push("/")`.
4. On failure, `setError` for each field error, and the problem goes to the summary.

The submit button is disabled and reads "Saving…" while `isSubmitting`, and is enabled again when an error comes back.

**Docs:**

- [web/docs/admin.md](../web/docs/admin.md): the description editor and what pasting keeps (see step 4), re-checking with `onTouched`, daylight-saving refusals, redirect to the home page, needs JavaScript, the fee preview left to payments step 7.
- [courses.md](courses.md) *Status* and the README *Status*.
- [web.md](web.md): link to this file for the admin form decisions.

**Tests** (component, with `user-event`):

- blur an empty field → message, red X, `aria-invalid`;
- a valid field → green check;
- a fixed field clears as the admin types;
- an untouched end time shows no error after the start time changes;
- submit while invalid → summary with every problem and focus on it, action not called;
- server errors on fields (including a deep `/description/…` pointer) and in the summary, button enabled again;
- button disabled while saving;
- adding and removing price rows;
- course length shown.

Typing into the editor is unreliable in jsdom (it relies on `contenteditable`). Form component tests replace the `description-editor` module with a simple stub (`vi.mock`), so they test the form, not Tiptap; editor typing is covered by the browser test.

Browser test (`yarn --cwd web test:browser`):

- fill the form against MSW, typing and bolding a word in the description, save, land on `/`;
- one refusal case;
- no hydration warnings in the console (a hydration warning means the server and browser rendered different HTML).

## Step 4. Description toolbar, list depth and Google Docs paste tests

**Toolbar** (in `description-editor.tsx`), built on Base UI's Toolbar (`role="toolbar"`, arrow keys move between buttons), with shadcn `toggle` styling and `aria-pressed` showing the state at the cursor:

- Bold, Italic;
- Heading and Subheading (levels 2 and 3; level 4 exists for pasted content);
- Bulleted list, Numbered list;
- Link: opens a small inline field for the address (no browser `prompt()`), refusing the addresses Tiptap refuses, with a message; "Remove link" when the cursor is on one.

Each button calls Tiptap's chain commands (`toggleBold`, `toggleHeading`, `setLink`, …), so undo keeps working.

**List depth:** a small keyboard override on ListItem stops Tab from indenting past level 3. Deeper lists can still arrive by paste and get the "Press Shift+Tab" message.

**Paste:**

- A real Google Docs clipboard sample (bold, italic, a Title, headings 1–4, a nested list, a numbered list starting at 3, a link, a table-of-contents link, blank lines, an image and a table), saved as a test fixture. The owner captures it: paste into the browser console's `addEventListener("paste", e => console.log(e.clipboardData.getData("text/html")))` page.
- Expected gap: Docs puts a nested `<ul>` beside the `<li>` instead of inside it, which may give an extra empty bullet. If the sample shows it, offer the owner a `transformPastedHTML` fix before adding it. Also check whether links come wrapped in `google.com/url?q=` redirects.
- Record in [web/docs/admin.md](../web/docs/admin.md) what pasting doesn't keep: Title, Subtitle and headings 1 and 5–6 become paragraphs; colours, fonts and spacing are dropped; numbered lists restart at 1; links with other schemes keep only their text.

**Tests:**

- the Google Docs sample pasted with `editor.view.pasteHTML(html)` (the real paste path, including Link's checks) and passed through `toCourseDescription` gives the expected document: formatting kept, image dropped, table text kept, table-of-contents link reduced to text, blank lines removed;
- Tab stops at level 3;
- each toolbar button changes the document and shows as pressed;
- a refused link address shows the message;
- browser test: paste the sample into the editor and see bold and a list.

## Step 5. Image and publish in the create form

**Image field** (`image-field.tsx`, required):

- A file input (`accept` JPEG/PNG/WebP).
- A 16:9 preview (`URL.createObjectURL`, `object-fit: cover`, centred, revoked on change), cropped like the public pages.

**Checks when a file is chosen,** shown before submitting: type; 5 MB or smaller; at least 800×450 pixels; at most 25 megapixels. The pixel checks use `createImageBitmap(file, { imageOrientation: "from-image" })`, so the photo's orientation counts like on the server, then `close()`. They run only in the browser; the API checks again.

**"Publish after saving"** checkbox, off by default.

**Actions** (one per outcome; each checks the course id is a UUID):

- `uploadCourseImageAction(courseId, formData)` uploads with the `uploadCourseImage` wrapper (`FormData` body serializer, as noted in [courses.md](courses.md)).
- `updateCourseAction(courseId, values, status)` checks `values` with the schema and sends `updateCourse`. It's used for publishing and for retries.

**The browser runs the steps in order:**

1. `createCourseAction(values)`, which returns the course id. The form keeps it.
2. `uploadCourseImageAction(id, formData)`.
3. If the box is ticked, `updateCourseAction(id, values, "published")`.
4. `router.push("/")`.

**If step 2 or 3 fails:**

- The admin stays on the form, with the error at the top, for example "The course was saved as a draft, but the image didn't upload."
- The next submit runs `updateCourseAction(id, values, "drafted")` with the current values, so fixes made before retrying are saved. It then uploads, then publishes if ticked. It never creates a second course.
- Nothing publishes unless the upload succeeded.

**Body size limit** in `next.config.ts`: `experimental.serverActions.bodySizeLimit: "6mb"`.

- Why 6 MB: one upload request carries the API's 5 MB image limit (`MAX_IMAGE_BYTES` in [course-image.ts](../api/src/courses/course-image.ts)) plus the multipart framing (the separators and short headers around each field). Next's docs suggest 10–20 KB of room for that.
- Next's default of 1 MB would reject most phone photos.
- The limit stays close to what's needed because Next reads the whole request into memory, and the limit covers every Server Action.
- Next reads `"6mb"` as 6 × 1024 × 1024 bytes, like the API.
- Add this reasoning to the existing decision row in [web.md](web.md).

**MSW:** `upload-course-image.ts` and `update-course.ts` handlers.

**Tests:**

- `createImageBitmap` is stubbed, since the test environment (jsdom) lacks it;
- preview shown;
- each file check shows its error;
- publish runs only after a successful upload;
- a failed upload keeps the id, and the retry calls `updateCourseAction` with the edited values, not `createCourseAction`.

**Docs:** when this step ships, the *Web admin pages* item in [courses.md](courses.md) and the README *Status* are ticked, and this file is cut down to decision rows.

## Verification (each step)

- `yarn --cwd web lint`, `yarn --cwd web build` (type check) and `yarn --cwd web test:unit`; `yarn --cwd web test:browser` from step 3.
- The tests listed in each step.
- Manually with `yarn --cwd web dev:mock`: tab through the form and check the outlines, icons and summary; paste a real Google Docs document into the description.
