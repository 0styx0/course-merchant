---
paths:
  - "api/**/*.spec.ts"
  - "api/src/test/**"
---

# API tests

Unit tests sit in `<module>/test/unit/`, never beside the file; integration tests in `<module>/test/integration/`; e2e in `src/test/e2e/`. A spec split by topic goes in a sub-folder named after the original spec (`test/unit/stripe.service/stripe.service.refund-and-webhook.spec.ts`), together with its `*.fixtures.ts`. When `test/unit/` itself passes 7 entries, group the sub-folders by topic (`courses/test/unit/` has `services/`, `schemas/` and `images/`).

- Unit tests build mocks with `MockMethods` and hand them over with `asDependency` (from `src/test/test-helpers.ts`), never a bare `as unknown as`; `fakePrisma({ onBegin, onCommit, onSettle })` stands in for `PrismaService` and records when transactions run. Use `vi.fn<Class["method"]>()` so canned values are checked against the real return type.
- Integration/e2e run serially and share `src/test/integration.setup.ts`, which wipes every table before each test in FK order — **add new tables there**.
- E2E builds the real app with `createE2eApp(overrides)` and hits it with supertest (`httpServer(app)` and `TypedResponse<Schema>` from `e2e-helpers.ts` keep `res.body` typed); pass `useStripeMock` / `useUnreachableStripe` (`src/test/e2e/stripe-mock.ts`) so the real SDK talks to stripe-mock. Shared fixtures are in `src/test/course-fixtures.ts`.
