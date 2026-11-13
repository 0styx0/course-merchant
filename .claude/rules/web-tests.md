---
paths:
  - "web/**/*.test.ts"
  - "web/**/*.test.tsx"
  - "web/tests/**"
---

# Web tests

- Every unit and component test starts at `FROZEN_NOW` (`web/src/test/frozen-now.ts`). Before each test, the setup file fakes `Date` and makes every `Temporal.Now` method read that fake `Date`; after the test, it restores both. Timers stay real.
- Spies and stubs restore themselves (`restoreMocks`, `unstubEnvs` and `unstubGlobals` are on in `web/vitest.config.mts`), so a test writes no undo code. Set a global or spy in `beforeEach`, never `beforeAll`, because the restore runs after every test.
- Build a "future" date from `FROZEN_NOW`, never from the real clock (`FROZEN_NOW + 3 * 60 * 60 * 1000`). A typed calendar date is fine beside it when its text format is what the test checks.
- A test that needs another moment calls `vi.setSystemTime(…)`, which moves `Date` and `Temporal.Now` together; the next test starts at `FROZEN_NOW` again.
- Assert an absence ("nothing shown", "not called", "dialog gone") only after a positive signal proves the check ran: a visible element on the same render, or, after async work, a signal in the same `waitFor`/`findBy` (the "Looks good" mark, `aria-invalid="false"` on the fixed field, the restored radio option, the rule's own result). Without it, a broken path passes.
- Tests run in `Pacific/Chatham` unless the shell sets `TZ` (the Vitest config sets it), so never assume UTC.
- Open a form page through `openFormPage` before typing or clicking, so the test starts after the page has attached its scripts.
- Component and hook tests await every async query, util and user event, and keep side effects out of `waitFor`. Lint enforces it; `web/eslint.config.mjs` lists the rules.
- Write each Playwright text locator to match one element, now and after the page grows. `getByText("…")` matches substrings, so a new button or link with the same words breaks the test (strict mode refuses two matches, as "$99.00" did once "Enroll for $99.00" appeared). Prefer `getByRole`; for text, pass `{ exact: true }` or a regex. Lint (`no-restricted-syntax` on `tests/browser`) refuses a bare string.
- After you change page markup or edit a browser spec, run the affected specs: `yarn --cwd web test:browser <spec file>`. `check:changed` skips browser tests, so a new element can break a spec it never touched.
- Find each Playwright element by role or by a label the page shows (`getByRole`, `getByLabel`), never by wrapper markup such as `locator("div").filter({ has: … })`. A redesign that drops a `<dl>` or adds a wrapper breaks a test that finds its target through that markup. Lint (`no-restricted-syntax` on `tests/browser`) refuses `locator("div")` and `locator("span")`; a CSS selector for a tag a test checks (`meta`, `h2`, `strong`) stays fine.
- Scroll a Playwright page with `page.evaluate(() => window.scrollTo(0, y))`, never `page.mouse.wheel`. The wheel call returns while Chromium's animated scroll still runs, so a later scroll races it and CI fails at random. Lint (`no-restricted-syntax` on `tests/browser`) refuses `mouse.wheel`.
