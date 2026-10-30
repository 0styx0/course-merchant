# Course creation (admin web page)

Read this before working on the admin "create course" page and the rich-text description it needs. Run it with `/next-commit course-creation`. It records progress, the design of each step, and why each choice was made. Page behaviour is described in the steps below; endpoints and shapes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml); how courses behave is in [courses.md](courses.md); how the web app is built is in [web.md](web.md).

Keep this file current **in the same commit as the work**. Tick the step, mark the next one **Next**, add a decision row for anything decided, and when a step ships, cut its notes down to decision rows.

## Status

Each step is one commit, outlined in detail before it starts. Every step's tests are part of the step.

- [x] **1a. Description renderer** (web only, not used by a page yet).
- [x] **1b-i. Description validator** (API only, not wired in).
- [x] **1b-ii. Store and show the document** (contract, database, API, course page).
- [x] **2. Server side of the create form** (no page yet): description helpers, form limits and contract test, wall-clock time to UTC, form schema, request builder, API wrapper, error mapping, Server Action and MSW handler (`createCourseAction`; its design is in *Step 2* below).
- [x] **3. The create form page**, in six commits (design in *Step 3* below):
  - [x] **3a.** Form libraries (react-hook-form, resolvers, user-event), shadcn `field`/`input`/`label`, and `ValidatedField` (message, red X, green check).
  - [x] **3b.** `error-summary.tsx`, the error list at the top with a link per problem and focus on a refused submit.
  - [x] **3c.** `description-editor/description-editor.tsx`, first version with no toolbar (adds `@tiptap/react`). It renders its own `ValidatedField` (label, state icon, error, counter); `ValidatedField` gained `labelId` and `onLabelClick`.
  - [x] **3d-i.** `course-form.tsx` with the text fields, description editor, schedule, `formatCourseLength`, one price row, error list and submit handling; `page.tsx` at `app/admin/(signed-in)/courses/new/` (no layout until the login lands); component tests.
  - [x] **3d-ii.** Price rows: `useFieldArray` in `course-form.tsx`, `price-row.tsx` (add and remove, at least one row, new rows start empty), error-list entries per row (`courseFormProblems` takes the row count; labels are numbered only with several rows), and tests. The empty-time help text now says "when the course is published" (wording only: an empty time is still set to now + 1 minute when saved).
  - [x] **3e.** Playwright browser test (`tests/browser/admin-courses/create-course.spec.ts`: save and land on `/`, an API refusal, no console errors); admin.md, courses.md, web.md and README updates.
- [x] **4. Description toolbar and Google Docs paste tests**, in three commits (design in *Step 4* below; browser tests go in the same spec file as 3e):
  - [x] **4a.** Formatting toolbar (`description-editor/description-toolbar.tsx`, shadcn `toggle`): Bold, Italic, Heading, Subheading, Bulleted list, Numbered list.
  - [x] **4b.** Link and Remove link buttons after the six format toggles (`description-editor/description-link-field.tsx`, `description-editor/description-link.ts`).
  - [x] **4c.** Google Docs paste fixture and tests (`src/mocks/fixtures/google-docs-paste.html`, `description-editor/description-paste.test.ts`), the browser paste test, and the admin.md list of what pasting doesn't keep.
- [x] **UX pass on the create form**, after step 4 and before step 5, from a UX review of the page (design in *UX pass* below). Grouped by complexity; each group is one commit, outlined and approved first as usual:
  - [x] **U1. Copy and small layout fixes** (wording and markup only). Also: a shared `CharacterCount` (name and summary counters), and the editor's counter now comes from Tiptap's `CharacterCount` extension (`@tiptap/extensions`, a direct dependency).
  - [x] **U2. Field and component behaviour** (price input, remove button, error summary height, time zone default, leave warning).
  - [x] **U3. Live summaries and the time zone picker** (new components), in three commits (see *UX pass* below):
    - [x] **U3a.** Schedule summary sentence.
    - [x] **U3b.** Price schedule list.
    - [x] **U3c.** Searchable time zone picker (shadcn Combobox, pick-only).
- [x] **5. Image in the create form**, in five commits (design in *Step 5* below):
  - [x] **5a.** `updateCourseAction` saves the form's values over an existing draft (not used yet); the shared action result helpers live in `save-course/course-action-result.ts`.
  - [x] **5b.** `uploadCourseImageAction` uploads a file through the new `uploadCourseImage` wrapper (not used yet); `/image` errors map to the `image` field; `bodySizeLimit` is `"6mb"`.
  - [x] **5c.** `image/image-field.tsx` picks a file, shows a 16:9 preview (kept for a refused file) and `image/course-image.ts` measures it once and holds the zod rule (not used yet); an undecodable file is stored as 0 × 0 and reported as unreadable.
  - [x] **5d.** The form requires an image and uploads it after creating the draft (`use-save-course.ts`); a failed upload keeps the draft id, and the retry updates then uploads. The form types are `CourseFormWithImageValues` and `CheckedCourseFormWithImageValues`; `CourseFormValues` stays the saved fields the actions check.
  - [x] **5e.** Browser tests with a real image (`src/mocks/fixtures/course-image.png`, 800 × 450): save with an image and land on `/`; a failed upload keeps the draft and the retry updates it, then uploads; no console errors.

- [ ] **6. Form behaviour fixes**, in four commits (design in *Step 6* below):
  - [x] **6a.** A change to a schedule date or time marks the field touched and re-checks it, plus the other schedule fields already touched or showing an error.
  - [x] **6b.** Schedule-wide messages (`type === "custom"`) show in a line under the Schedule heading (`schedule-problems.tsx`); the time field keeps its border and X and points `aria-describedby` at the line.
  - [x] **6c.** The end date input's `min` is the start date (none while it is empty), so the picker opens near it; still to confirm by hand in Chrome.
  - [x] **6d.** `StatusIcon` always renders a fixed `size-4` slot, so the X and the check no longer shift the input.
- [ ] **7. Layout and wording**, in three commits (design in *Step 7* below):
  - [x] **7a.** `priceSummary` returns nothing until any price input has text; `PriceSchedule` keeps its empty `aria-live` box (`empty:-mt-4` cancels the section gap); the Pricing text says "Enter 0 for a free course."
  - [x] **7b.** New field order and section names: Basics (Image, Course name, Summary, Description), Course material, Schedule (Time zone first, in a full-width row), Pricing. The "Content link" label is unchanged.
  - [ ] **7c.** Each form section is a card. **Next**
    - *Files*:
      - [form-section.tsx](../web/src/components/form/form-section.tsx) (card classes per the card decision row)
      - [course-form-sections.tsx](../web/src/features/admin-courses/course-form/course-form-sections.tsx) (only if the schedule grid needs a change inside the card)
    - *Behaviours*:
      - The schedule's two-column grid still lays out inside the card.
      - Sections stay named groups (existing test).
      - The legend reads inside the card, not on its border.
      - No horizontal scroll at about 400 px; tab order unchanged.
    - *Settled*: the card decision row.
    - *Done when*: unit and browser tests pass; checked by hand at about 400 px and keyboard-only, in light and dark mode.

Not part of this work: publishing from the form (a "Publish after saving" box and the update to `published`; it belongs to the later edit-a-course work, where the status is chosen), admin login and logout, the admin course page and list, editing a course (loading a stored document into the editor is `setContent`, no conversion), the payout estimate under the price (payments step 7), a Playwright test comparing the image preview with the saved image, and plain-text or email versions of the description (the static renderer can produce Markdown later).

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
| The API keeps a byte-identical copy of the web's [description-extensions.ts](../web/src/features/course-description/description-extensions.ts), and a unit test fails if they differ | The packages aren't a workspace, and a shared package would restructure the repo for one 15-line file | A workspace package; importing the web's file from the API |
| The API stores the editor schema's normalised JSON, and extra attributes are dropped rather than refused | Comparing `toJSON()` with the request would refuse valid documents, since it adds default attributes (`link.target`, `rel`, `class`, `orderedList.start`). Unknown attributes are harmless once dropped, and the stored document is exactly what the renderer and editor understand | Refusing unknown attributes by comparison |
| Link schemes are `https:`, `http:`, `mailto:` and `tel:` | Chosen by the owner; an explicit list is easier to state and test than Tiptap's defaults | Tiptap's default list; `https`, `http` and `mailto` only |
| Every text field with a limit shows an "n / limit" counter that never blocks typing. The description uses Tiptap's `CharacterCount` extension (without its `limit` option); the other fields use the shared `CharacterCount` component. The form's check of the description mirrors the extension's count (`textBetween` with a space for line breaks and rules) | Matches the description's behaviour; a hard `maxLength` or the extension's `limit` would silently drop pasted text. The counter shown and the form's check always agree, and the API counts only text, so it never refuses what the form accepts. Cost: a document with many line breaks can be refused by the form a few characters before the API would refuse it | The native `maxLength` attribute; the extension's `limit` option; our own text-only count for the description (could disagree with the counter) |
| The column is `Jsonb` (Postgres `jsonb`), and the generic JSON type is cast to the contract's document type in one place, `storedDescription` in [courses.mapper.ts](../api/src/courses/courses.mapper.ts) (and `toStoredDescription` for writes) | Prisma 8's bare `Json` is plain `json`, which keeps raw text. Only validated documents are written, so the cast is safe, and two call sites beat casting in every repository finder. The generated type has an index signature, which Prisma's `JsonValue` refuses, so a write needs the cast too. The migration is a destructive `text → jsonb` change, and the databases were recreated | Casting in each repository finder (about six call sites) |
| The course page shows the summary under the name and the description below the header | The description is now a block of headings and lists, which doesn't belong in a header. The summary is already the page's meta description and the card text | Showing no summary on the course page |
| Not enforced by the API: list depth, blockquotes and rules inside lists, empty paragraphs, `maxItems` | Owner's call: the API checks security and basic correctness, the 100 KB body limit bounds size, and the editor is the only writer. The editor doesn't limit list depth either: deep lists, typed or pasted, are saved as they are. The web's `toCourseDescription` still strips empty paragraphs | Walking the tree for each rule (about 40 more lines and tests); a Tab override stopping nesting at level 3 (nothing enforces depth, so a limit only in the editor is inconsistent) |
| Headings are levels 2-4 in the extension list, and the contract (1b) uses the same levels | The course name is the page's `<h1>`, so the editor never makes another; Tiptap's own output is then correct with no heading mapping. A pasted level 1 becomes a paragraph | Levels 1-3 with a renderer that shifts them down; allowing levels 1-6 |
| Blockquotes, horizontal rules, strikethrough and underline are allowed; code and code blocks are not | The owner wants them; each is one Tiptap extension and styled by `.description-content`. Code stays off: nothing in a course description needs it. Underlined text looks like a link, so the toolbar (step 4) should label underline clearly | Leaving them out (first plan) |
| Links open in the same tab (`HTMLAttributes: { target: null }`), and `rel="noopener noreferrer nofollow"` stays | A new window is an unannounced change of context (WCAG G201 advises warning the reader), and a writer can't add that warning to their own link text | Tiptap's default `target="_blank"` |
| No `class` attribute on links in the contract | Nothing sets it. Stored CSS names tie old content to today's styles, Tailwind can't see names that live only in the database, and a free-text class could reuse utility classes (`fixed inset-0 z-50`) to cover the page. If button-style links are ever wanted, store a named option (`variant: "button"`) | A `class` field; an allow-list of class names |
| The toolbar is built by hand from Base UI's [Toolbar](https://base-ui.com/react/components/toolbar) with shadcn `toggle` styling | About seven buttons, each one Tiptap command. [Tiptap UI Components](https://tiptap.dev/docs/ui-components/getting-started/overview) are best supported on React 18 / Next 15 (this repo is React 19 / Next 16) and bring a second set of button styles | Tiptap UI Components |
| No empty paragraphs in the stored document; `toCourseDescription` strips them and the API refuses them | Blank lines from Docs and the editor's trailing empty line show as blank space in the editor but take no height on the page. Spacing between paragraphs comes from CSS | Keeping them and giving them a line of height |
| One web form schema, no Zod shared with the API, plus a contract test | The API's validators load server settings and NestJS ([allowed-currencies.ts](../api/src/courses/validation/allowed-currencies.ts) reads `process.env`, [error-codes.ts](../api/src/common/errors/error-codes.ts) imports `@nestjs/common`), the packages aren't a workspace, and the form's values differ from the request. The request builder is type-checked against the generated `CreateCourseRequest`; the contract test compares the form's limits with [openapi-v1.yaml](../api/openapi/openapi-v1.yaml) | Sharing the API's schemas |
| Admin forms use react-hook-form and call Server Actions as functions; public forms are free to use `useActionState` | Per-field touched/valid state, `useFieldArray` for price rows and `setError` for server errors, with typed values and no `FormData` parsing. The page needs JavaScript anyway | [Conform](https://conform.guide) (its advantage, working without JavaScript, doesn't apply here); `useActionState` for this page |
| An empty "takes effect" becomes now + 1 minute | The API refuses times in the past, and "now" is already past when the API checks it. Cost: a course published later can show up to a minute after its price's start. A retry more than a minute after the first save sends a new "when saved" time, so the API keeps the now-active price and adds another; the course is still a draft then | Sending "now" |
| The image is measured once when chosen, and the form schema checks the stored width and height | Decoding a large photo is slow, and the form re-checks on every keystroke | An async zod rule calling `createImageBitmap` (decodes the image again on each check); `setError` from the field (cleared by the next check, so a bad image could be submitted) |
| After a refused submit, focus moves to the error list | Screen readers read every problem; each link jumps to its field | Focusing the first invalid field |
| [temporal-polyfill](https://github.com/fullcalendar/temporal-polyfill) for wall-clock time to UTC | Correct across daylight-saving changes, with `disambiguation: "reject"` for skipped or repeated times. About a third of the size of [@js-temporal/polyfill](https://github.com/js-temporal/temporal-polyfill) | `@js-temporal/polyfill`; hand-written offset maths |
| Native `date`, `time` and file inputs | They already do the job | Date pickers, [react-dropzone](https://react-dropzone.js.org), [next-safe-action](https://next-safe-action.dev) |
| The time zone is a searchable shadcn Combobox (Base UI underneath) that accepts only a listed zone | About 420 names are hard to scroll; the API accepts all of them, so a short list would block some admins. shadcn's combobox is already in the project's style. Matching is a case-insensitive "contains" with `_` as a space, no aliases (EST) | A short list of common zones; keeping the native select; free text in the box |
| The create form is built in two commits: the plain fields and schedule first, price rows second | The full form is too large to review as one change; price rows are an independent addition (`useFieldArray`) | One commit for the whole form |
| Step 4 is built in three commits: toolbar, link, paste | Each part has its own tests, and the paste fixture waits on the owner's clipboard sample | One commit for all of step 4 |
| The Link button checks the address against the API's schemes (`https:`, `http:`, `mailto:`, `tel:`, full address, at most 2,048 characters) before `setLink`; the shared extension list keeps Tiptap's default `isAllowedUri` | Tiptap's default also accepts `ftp:`, `sms:` and addresses with no scheme, which the API refuses, so the admin would only find out on save. A stricter `isAllowedUri` in the shared list would also stop autolinking `www.example.com` (autolink checks the raw word) and change the API's copy | A stricter `isAllowedUri` in the shared extension list; relying on `setLink`'s own check |
| The link address is typed in an inline field under the toolbar; Link is disabled until text is selected or the cursor is on a link; Remove link is its own toolbar button, disabled off a link | Plain markup with simple tab order, no positioning or focus trap; removing takes one click; disabled rather than hidden keeps the toolbar's arrow-key order stable | `prompt()`; a popover; inserting the address as text when nothing is selected |
| Toolbar buttons keep focus in the editor on a mouse click (`preventDefault` on mouse down) | A click would otherwise blur the editor, mark it touched and show "Enter a description" on an empty field; the selection stays where the admin made it | Letting focus move to the button and refocusing with `.focus()` only |
| Pasted Google Docs content is kept as the editor reads it, with no paste-cleaning code | Tiptap's own paste handling already puts a Docs nested list inside its item, keeps links (including Docs' own table-of-contents links) and turns the Title and Heading 1 into paragraphs. The admin sees what they expect, so a `transformPastedHTML` hook would add code for nothing. Links with other schemes are left to the API's error on save; blank lines from Docs stay as line-break paragraphs | A `transformPastedHTML` nested-list fix; dropping same-document and non-API-scheme links on paste; stripping line-break-only paragraphs |
| Prices accept a comma as the decimal mark (`79,50`), through one `normalizeDollars` used by the form check and the cents conversion. The leave-page warning uses `beforeunload` only | Admins in comma-decimal locales type it naturally, and `1,000` still fails instead of being misread. The App Router can't intercept in-app links, and the page has none | Thousands separators; a custom link-interception layer |
| Each form section is a card: thin border, rounded corners, a faint `bg-muted/30` tint in light and dark mode, `p-5` to `p-6`, heading inside. Inputs stay `bg-background`, so they read as white on grey | A box is the strongest cue that fields belong together. A tint of the page's own neutral colour leaves red errors and green checks as the only strong colours, so state never competes with decoration | A different colour per section (clashes with red and green, busy); divider lines only (still a flat column on a long form); numbered steps (suggest an order or wizard the form isn't) |
| Cross-field schedule messages keep their field path, so the error list link and focus still work. A line under the Schedule heading shows them, and the time field keeps its red border | One source of truth: the form state, so list and message can't disagree | A new "schedule" field path (the list link needs a target and the API error mapping changes); showing the message in both places (the page jumps, as the UX pass found) |
| The status icon has a fixed slot beside every input, empty until the field shows an X or a check | The input keeps its width while errors come and go, and every kind of field works the same way | An icon inside the input (clashes with the date and time inputs' own icons and the time zone chevron); dropping the X (one less error signal, but the check would still shift the input); dropping both (loses the only "this field is fine" signal) |
| The end date input's `min` is the start date | The picker opens near the start date and greys out earlier days, without filling in a value the admin didn't choose | Copying the start date into an empty end date (always works, but it writes a value the admin may not notice) |
| The price outline shows only once any price input (amount, start date or time) has text, and hides when all are empty | An outline of nothing on first load is noise; it is derived from the values, so there is no state to keep in step (revisit after use) | Always showing it (noise on first load); showing it once an amount is typed (simpler, but the owner wants any input to count) |
| Field order: Image first in Basics; Time zone first in Schedule; "Content" renamed "Course material" | The image is the first thing a buyer sees; the zone frames how the times below are read; "Content" was vague (revisit after use) | Image in its own section (the previous layout); time zone after the times |

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
- `schedule.startDate` and `schedule.startTimeOfDay`, `schedule.endDate` and `schedule.endTimeOfDay` (two inputs each: a date `2026-07-01` and a time of day `09:00`, typed in the chosen zone), `schedule.timeZone`. The API's `startTime` and `endTime` are the combined UTC instants, so the form avoids those names;
- `prices.N.amountDollars` ("79.50"; the API's `amount` is cents), `prices.N.effectiveDate` and `prices.N.effectiveTimeOfDay` (both empty for "when saved"; one without the other is refused);
- `image` (step 5; a file plus its measured size, never sent as JSON).

Price rows go to the API in the order shown, so the API's `/prices/0` is the form's first row. Any path under `/description/` maps to `description`.

## Step 2. Server side of the create form (done)

Shipped in six commits (2a–2f). Limits and the currency constant live in the `admin-courses` feature, not in global config. What is left to know:

- The "at least a minute from now" rule for a set price time is in the schema and uses the browser's clock; the API has the final say.
- The time zone is checked against `Intl.supportedValuesOf("timeZone")`. The browser and server lists can differ slightly; a zone the server doesn't know is refused with "Choose a time zone." Accepted as rare.
- Dollars to cents is `Math.round(Number(dollars) * 100)`. `Intl.NumberFormat` only formats, it can't parse. The schema's two-decimal check is the guard.
- `toCourseRequest(values, status)` takes the schema's output and throws if a time can't be converted (a bug in the caller). `status` is typed `CreateCourseStatus`; step 5 widens it when it adds the update request. `updateCourse` is added with step 5 too, as nothing uses it before.
- `fieldErrorsFromProblem` maps JSON Pointers to form paths. A pointer for a date-and-time value (`/schedule/startTime`, `/prices/N/effectiveAt`) maps to the time-of-day box. Pointers the form has no field for appear only in the summary (the problem's `detail`).
- `createCourseAction(values)` re-checks with `courseFormSchema` (no API call if invalid), saves with status `drafted`, and returns `Result<{ courseId }, { problem, fieldErrors }>`. A problem that isn't a validation one returns empty `fieldErrors`.
- MSW: `mocks/handlers/create-course.ts` (`success`, `validationFailed`, `error`) with the `draftedAdminCourse` fixture.

## Step 3. The create form page

**Page.** `app/admin/(signed-in)/courses/new/page.tsx`, title "New course".

- It builds the time zone list on the server (`Intl.supportedValuesOf("timeZone")`) and passes it in, so the browser and server render the same list.
- The default time zone is `America/New_York`.

**Form** (`course-form.tsx`, client component):

- `useForm({ resolver, mode: "onTouched", shouldFocusError: false })`.
- `useFieldArray` for price rows, with add and remove buttons and at least one row.
- Changing the time zone calls `trigger(["schedule", "prices"])`.
- Changing the start time re-checks the end time.
- Below the times: a summary sentence ("Runs … to … (zone). Lasts 2 hours 30 minutes.") once both are valid, from `scheduleSummary` and the small `formatCourseLength` helper. TypeScript has no types for `Intl.DurationFormat` yet.

**Description editor, first version** (`description-editor/description-editor.tsx`, no toolbar yet):

- `useEditor` with the shared extension list and `immediatelyRender: false` (Tiptap's setting for server-rendered React, avoiding a server/browser mismatch).
- Connected through react-hook-form's `Controller`: `onUpdate` sets the value through `toCourseDescription`, the editor's blur calls `onBlur`.
- Pasting from Google Docs and the keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, Shift+Enter) already work without a toolbar.
- The editable area gets `id`, `role="textbox"`, `aria-multiline`, `aria-labelledby`, `aria-invalid`, `aria-describedby` and the shared `description-content` class through `editorProps.attributes`.
- Focus: clicking the label focuses the editor (a `<label>` can't focus a contenteditable area on its own); `field.ref({ focus: () => editor?.commands.focus() })` lets react-hook-form and the error-list link focus it.
- No help text under the field (dropped at the 3c outline).
- A "1,234 / 5,000" counter from Tiptap's `CharacterCount` extension (added without its `limit` option, which would block typing), shown by the shared `CharacterCount` component (numbers formatted with `"en-US"`, so the server and browser show the same text): linked through `aria-describedby`, not a live region, so it isn't read out on every keystroke; typing past 5,000 is never blocked, the counter turns red and the field shows the error.

**How a field shows its state** (`components/form/validated-field.tsx`, built on shadcn [`field`](https://ui.shadcn.com/docs/components/field); done in 3a). It takes `touched`, `submitted` and `error` as plain props, with no react-hook-form import, and renders its one input through a render function that hands over `id`, `aria-invalid` and `aria-describedby` (help text and message both), which the caller spreads onto the input:

- An error shows only once the field has been touched or the form has been submitted. A re-check started by another field doesn't show an error on a field the admin hasn't reached.
- Invalid: red outline, red X icon in a fixed slot beside the input, and the message below. The input gets `aria-invalid` and `aria-describedby` pointing at the message.
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

Typing into the editor is unreliable in jsdom (it relies on `contenteditable`). Form component tests replace the `description-editor/description-editor` module with a simple stub (`vi.mock`), so they test the form, not Tiptap; editor typing is covered by the browser test.

Browser test (`yarn --cwd web test:browser`):

- fill the form against MSW, typing and bolding a word in the description, save, land on `/`;
- one refusal case;
- no hydration warnings in the console (a hydration warning means the server and browser rendered different HTML).

## Step 4. Description toolbar and Google Docs paste tests

**Toolbar** (4a, done: `description-editor/description-toolbar.tsx`, above the editable area): Base UI's Toolbar (`role="toolbar"`, arrow keys move between buttons) with shadcn `toggle` buttons; `aria-pressed` comes from `useEditorState`. Icon buttons named by `aria-label` and `title`. Heading and Subheading are levels 2 and 3; level 4 exists for pasted content. Buttons are disabled until the editor exists in the browser. Underline, strike, quote and rule have no button (shortcuts and paste still work).

- Link (4b, done): a Link button (enabled with text selected or the cursor on a link) opens an inline field under the toolbar (`description-editor/description-link-field.tsx`; Enter applies, Escape cancels, prefilled and changing the whole link when on one). The address is checked by `isAllowedDescriptionLink` (the API's rules), with a message. A separate "Remove link" button is enabled on a link.

Each button calls Tiptap's chain commands (`toggleBold`, `toggleHeading`, `setLink`, …), so undo keeps working.

**Paste** (4c, done): see the decision row on Google Docs paste. The captured sample is `src/mocks/fixtures/google-docs-paste.html`; Docs puts a nested list beside its item, but Tiptap reads it correctly. A pasted `<ol start>` keeps its number.

**Tests** (done): paste tests in `description-editor/description-paste.test.ts` and one browser test; toolbar button and refused-link tests were added with 4a and 4b.

## Step 5. Image in the create form (done)

Publishing is not part of this step: the form always saves a draft and the button stays "Save as draft". Choosing the status belongs to the later edit-a-course work.

- The image field is required. It shows a 16:9 preview and checks type, size and pixels when a file is chosen (see the decision row on measuring once). The API checks again.
- On submit the browser runs, in order: `createCourseAction` (the form keeps the course id), `uploadCourseImageAction`, then `router.push("/")`.
- If the upload fails, or an action is rejected, the admin stays on the form with the error at the top and the draft id kept.
  - An upload error from the API shows on the image field.
  - The next submit runs `updateCourseAction(id, values)`, then uploads. It never creates a second course.
  - The leave warning stays on until the upload succeeds.
- The Server Action body limit is `"6mb"`; the reasoning is in the Server Action row of [web.md](web.md).

## UX pass

Findings from using the page in Chrome (`yarn --cwd web dev:mock`, 2026-10-28), then the planned fixes. The first version works and its errors are clear; the problems are structure and guidance. Not checked yet: phone width (about 400 px) and keyboard-only use. Check both after each group.

**What the review found**

- One long column of 10+ fields. "Schedule" and "Price" are small labels; the page has no intro and no sections.
- The description editor shows no sign of formatting (step 4's toolbar fixes this). Typing `**bold**` silently turns bold.
- "Schedule" doesn't say what it controls (when the course runs). Four separate date and time fields; the "Lasts X" line is easy to miss.
- Price: the legend says USD but the field has no `$`; `$79,50` is refused with "Enter a price, like 79.50". The price row has no explanation of a price schedule; the "leave empty" help sits under one of the three fields; the disabled Remove gives no reason.
- Each problem shows twice (summary and field), as intended for accessibility, but the summary changes height as errors clear, so the page jumps while the admin types.
- The save button is at the very bottom and doesn't say it saves a draft.
- Time zone is a native select of about 420 names. Leaving the page loses all work.

**U1. Copy and small layout fixes**

1. A one-line intro under the title: details, price, saved as a draft, nothing public until published.
2. Titled sections with a one-line description each: **Basics** (name, summary, description), **Content** (link), **Schedule** ("when the course runs"), **Pricing**. Leave room for step 5's image.
3. Placeholders or example help text for name and summary, and a visible character limit on both (as the description already has).
4. One shared help line for the price start date and time, instead of one under a single field.
5. Button label **Save as draft**. Saving always makes a draft, and step 5 keeps the label (publishing is left to editing).

**U2. Field and component behaviour** is done: `$` prefix and comma decimals on the price (see the decisions table), Remove hidden while there is one price row, the error list capped at 12rem, scrolling and sticky, the time zone starting on the browser's (America/New_York when the list lacks it; it stays beside the times), and a `beforeunload` leave warning while the form has unsaved changes.

**U3. Live summaries and the time zone picker** (new components), built as U3a (item 11), U3b (item 12) and U3c (item 13).

11. **U3a, done.** A plain-sentence summary of the schedule, e.g. "Runs Jan 3, 2027, 9:00 AM to Feb 28, 2027, 5:00 PM (America/New_York). Lasts 56 days." It replaced the "Lasts X" line. Dates are US style with a fixed `en-US` locale (owner's choice: prices are US dollars), so the text is the same in every browser.
12. **U3b, done.** A summary of the price schedule under the rows: a lead line with the time zone, then a Roman-numeral ordered list with one line per price in start order, e.g. "I. $99 from when the course is published", "II. $79 from Feb 1, 2027, 9:00 AM". A list, not one sentence, so seven prices stay readable. It always shows. Only the broken piece reads "Error", in red: "$79 from Error" for an incomplete, impossible or repeated start, "$Error from Feb 1, 2027, 9:00 AM" for an invalid amount. A price not typed yet is an empty item. Lines with an "Error" start go after the dated ones; `0` reads "Free".
13. **U3c, done.** A searchable time zone picker instead of the native select: typing narrows the list, and the value changes only when a zone is picked.

**Out of scope here:** where the form goes after saving, and any "saved" confirmation. The owner will change the redirect later; add the confirmation with it.

**Tests:** update the component tests and `tests/browser/admin-courses/create-course.spec.ts` for changed labels and behaviour; each new component gets its own test; no hydration warnings.

## Step 6. Form behaviour fixes

- Why here: the owner used the page after step 5 and found validation and input-width problems. Behaviour fixes come before layout, so the layout commits land on stable code.
- Needs: none.
- Builds on: [course-form-sections.tsx](../web/src/features/admin-courses/course-form/course-form-sections.tsx) (the schedule fields), [course-form-cross-field-issues.ts](../web/src/features/admin-courses/validation/course-form-cross-field-issues.ts) (schedule messages), [validated-field.tsx](../web/src/components/form/validated-field.tsx) (the status icon). `mode: "onTouched"` is in the *Principles*.
- Done when: unit and browser tests pass; in `yarn --cwd web dev:mock`, using only the pickers, an invalid date shows its error at once and clears when corrected; the end date picker opens at the start month; inputs keep their width when an error appears or clears.
- Risk: Chrome may ignore `min` when choosing which month the picker opens at (6c).
- Design notes:
  - Cross-field issues have type `custom` and the "required" checks have `too_small`. [The resolver](../web/node_modules/@hookform/resolvers/zod/src/zod.ts) copies the issue code into the error's `type`, so 6b tells schedule-wide messages from "required" ones by `type === "custom"`.
  - A native date picker may never blur its input, and `ValidatedField` shows a problem only for a touched field. So in 6a a change marks the field touched (`setValue` with `shouldTouch` and `shouldValidate`). The green check then shows right after a pick, for schedule fields only (owner approved).
  - Price rows keep their messages; this step covers the schedule only.
  - 6c and 6d don't depend on 6a or 6b.

- [x] **6c.** The end date input's `min` is the start date; still to confirm by hand in Chrome (`dev:mock`) that the picker opens at the start month.
- [x] **6d.** Done (see the status list).

## Step 7. Layout and wording

- Why here: layout and wording touch the same files as step 6, so they come after the behaviour is fixed.
- Needs: 6.
- Builds on: [course-form-sections.tsx](../web/src/features/admin-courses/course-form/course-form-sections.tsx), [course-form-problems.ts](../web/src/features/admin-courses/course-form/course-form-problems.ts) (field order), [form-section.tsx](../web/src/components/form/form-section.tsx), the U3b price list in `price/price-schedule.tsx`.
- Size: 3 commits (see the status list).
- Done when: unit and browser tests pass; the page shows the new order, names and cards at about 400 px.
- Design notes *(temporary; cut to decision rows when step 7 ships)*:
  - Outline visibility is derived from the watched `prices` on each render, inside `priceSummary`; no stored state. The "anything typed" rule lives there, not in `course-form.tsx`, and is tested in `price/`.
  - The `aria-live` wrapper stays in the page while empty: a live region added together with its text is often not read out. It must not add a flex gap under "Add price"; `hidden` is not an option because it removes the region from the accessibility tree.
  - A border on a `<fieldset>` draws the `<legend>` on the border line, so 7c puts the card on the fieldset with the legend floated full width, or wraps it; chosen in 7c's outline.
  - No folder gains a file (`course-form/` stays at 9).

## Verification (each step)

- `yarn --cwd web lint`, `yarn --cwd web build` (type check) and `yarn --cwd web test:unit`; `yarn --cwd web test:browser` from step 3.
- The tests listed in each step.
- Manually with `yarn --cwd web dev:mock`: tab through the form and check the outlines, icons and summary; paste a real Google Docs document into the description.
