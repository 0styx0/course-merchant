# Code style cleanup

Read this before working on the cleanup. Run it with `/next-commit code-style-cleanup`. It brings existing code in line with the CLAUDE.md rules *Small composed functions*, *Simple ternaries only*, *Flat and immutable by default* and *Don't duplicate state*, and fixes the readability problems (file names, file contents, folder layout) found in an audit on 2026-10-29.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each step is one commit, outlined in detail before it starts, and **changes no behaviour**: the existing tests must pass unchanged (a test may change only where it names a moved or renamed file or function). A step that would change behaviour, a public name, or the folder layout is marked **ask** and needs the owner's OK in the outline.

- [x] **0a.** The ternary rule: `docs(claude): allow simple wrapped ternaries and rename the rule to "Simple ternaries only"` (CLAUDE.md, next-commit skill). Done.
- [x] **0b.** `refactor: replace ternaries with multi-line branches by early returns and named helpers` (8 spots in `api/` and `web/`). Done.

API, validation and errors:

- [x] **1. Update rules as small rules.** Split `findUpdateRuleViolations` in [course-update-rules.ts](../api/src/courses/validation/course-update-rules.ts) into one function per rule (image before publishing, start and end not in the past, price not in the past, a price in effect), joined with `flatMap`, no `errors.push`. Done.
- [x] **2. Description problems as small checks.** Split `findProblems` in [course-description-schema.ts](../api/src/courses/validation/course-description-schema.ts) into bad text, bad links and total length, built with `flatMap`/`map` and no `let allText`. Done. The error list is now grouped (all bad text, then all bad links, then the length problem).
- [x] **3. Error filter as small mappers.** [problem-details.filter.ts](../api/src/common/errors/problem-details.filter.ts): `catch` only sends what a `toProblem(exception)` returns, with one small mapper per exception kind. The error-to-text helper it shares with `errorStack` in [payment-sweeper.ts](../api/src/payments/payment-sweeper.ts) moves to one place under `common/errors/`. Done.

API, courses and enrollments:

- [x] **4. One mapping from request to stored course.** [admin-courses.service.ts](../api/src/courses/admin-courses.service.ts) writes the course fields and the price mapping twice (create and update); make them one small function each.
- [x] **5. Admin course repository as steps.** [admin-courses.repository.ts](../api/src/courses/repositories/admin-courses.repository.ts): `createCourse` and `updateCourse` share a "course fields" object and one "load it or throw" function; `updateCourse` becomes `replacePrices` + `appendStatus` + reload. Done.
- [x] **6. Grant access as two steps.** `grantAccess` in [enrollments.repository.ts](../api/src/enrollments/enrollments.repository.ts) becomes `insertEnrollment` and `reactivateEnrollment`. Keep the comments about the concurrent update. Done.
- [x] **7. Leftover long API functions.** `toAdminCourseResponse` ([courses.mapper.ts](../api/src/courses/courses.mapper.ts)), `createCheckoutSession` ([stripe.service.ts](../api/src/payments/stripe.service.ts)); split only if the outline shows a clear gain. Done: the admin response got a mapper per price and per enrollment; the checkout call got `checkoutSessionParams`, `requireSessionUrl` and one `throwProviderError` shared by checkout, retrieve and refund.

Web:

- [x] **8. Cross-field checks get their own file.** Move `convert`, `scheduleIssues`, `priceTimeIssues` and `crossFieldIssues` out of [course-form-schema.ts](../web/src/features/admin-courses/course-form-schema.ts) into `course-form-cross-field-issues.ts`. Move only; the dollar parsing stays. Done (with step 9).
- [x] **9. Cross-field checks flat.** Rewrite the moved `priceTimeIssues` as one small function per case (half-filled row, too soon, same time as another row) with no `return void issues.push` and no mutable list; `scheduleIssues` the same. Done. Each row's own problems are worked out first, then a second pass flags rows that share a time with an earlier row (no `Set`).
- [x] **10. `try`/`let` pairs as small parsers.** [wall-clock-time.ts](../web/src/features/admin-courses/wall-clock-time.ts) and [base-url.ts](../web/src/lib/api/base-url.ts): each `try` moves into a function that returns a value or `undefined`, so the `let` goes. Add the missing "why a cache" comment to the lazy `let` in `course-form-schema.ts`. Done (also `contentUrlProblem`, via `isWebUrl`).
- [x] **11. Form behaviours as hooks.** From `CourseForm` ([course-form.tsx](../web/src/features/admin-courses/course-form.tsx)) move the browser-time-zone reset, the leave warning and the focus-the-summary effect into three small hooks. Done: they live in [course-form-hooks.ts](../web/src/features/admin-courses/course-form-hooks.ts).
- [x] **12. Form sections as components.** `CourseForm` renders `BasicsSection`, `ContentSection`, `ScheduleSection` and `PricingSection`; the form itself keeps only state and submit. Target: no function over about 40 lines. Done: the four sections live in [course-form-sections.tsx](../web/src/features/admin-courses/course-form-sections.tsx).
- [x] **13. Toolbar and link field as parts.** [description-toolbar.tsx](../web/src/features/admin-courses/description-toolbar.tsx): `LinkButton` and `RemoveLinkButton` components. [description-link-field.tsx](../web/src/features/admin-courses/description-link-field.tsx): the key handling becomes a named function. Done: the toolbar has `FormatButton`, `LinkButton`, `RemoveLinkButton` and `removeLink`; the link field has `handleKey`.

Names and layout (each is a rename or move; **ask**, and update every import, test and doc that names the old path):

- [x] **14. Summaries get honest file names.** [format-course-length.ts](../web/src/features/admin-courses/format-course-length.ts) also holds `scheduleSummary`, `priceSummary` and `formatMoment`. Split into `schedule-summary.ts` and `price-summary.ts`, keeping `formatCourseLength` where the outline settles. **ask** (names) Done: `format-course-length.ts` keeps only `formatCourseLength`; the two summaries have their own files; `formatMoment` is in `format-moment.ts` and `toUtcMs` in [wall-clock-time.ts](../web/src/features/admin-courses/wall-clock-time.ts), since both summaries use them.
- [x] **15. Two `formatDate`s.** The web one returns a formatter, not a date: rename it (for example `dateTimeFormatter`). The API one is `Instant.toString()` with an empty doc comment: inline it or document it. Fold `web/src/lib/utils.ts` (only `cn`) into `web/src/lib/utils/`. **ask** Done: the web one is `dateTimeFormatter`; the API helper is gone (callers use `.toString()`); `cn` is in `web/src/lib/utils/cn.ts` and the `components.json` alias points at it.
- [x] **16. Folder names.** Renamed `api/src/courses/courses.repository/` to `repositories/` (matching `pipes/` and `validation/`). Done.
- [x] **17. One place for tests.** Every unit spec now lives in `<module>/test/unit/` (rule in [api-tests.md](../.claude/rules/api-tests.md)). Done: the `common/`, `courses/validation/`, email, payments and prisma specs moved, and `port-config.ts` with its spec moved into a new `src/config/`.
- [x] **18. Stray doc.** Done: `web/docs/admin.md` (the admin page's Given/When/Then spec) was deleted at the owner's request and the links to it removed.
- [x] **19. Sub-folders in `admin-courses/`.** 30 flat files; group the description editor (editor, toolbar, link field, link, paste test) in `description-editor/`. **ask** Done: the 8 `description-*` files (with their specs) moved into [description-editor/](../web/src/features/admin-courses/description-editor/), names unchanged.
- [ ] **20. `payments/` by job (optional, last). (Next)** 12 flat files; group into `stripe/`, `fulfillment/` and `sweeper/`. Largest move, touches many imports; skip if steps 1–19 left it readable. **ask**

## Order

Steps 1–7 (API) and 8–13 (web) are independent, so either side can go first; within a side they go in order (8 before 9, 11 before 12). Renames and moves (14–20) go last because they touch the most imports and would conflict with the rewrites above.

## Per-step routine

For each step, in a clean session: `/next-commit code-style-cleanup`. The outline lists the small functions the step will end up with, then waits for the go-ahead. After implementing: run `yarn --cwd api test:unit` (or the web equivalent), the type check, and the integration tests for any step that touches a repository (5, 6). Tick the step here and stop with a commit message.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Unit specs live in `<module>/test/unit/`, never beside the code. | One place to look; 7 modules already did it, and integration and e2e specs are already in their own folders. | Colocating everything: it would move the ~30 specs already in `test/unit`. |

Add a row for anything else decided in an outline (the owner OKs the text first).
