---
paths:
  - "web/**/*.test.ts"
  - "web/**/*.test.tsx"
  - "web/tests/**"
---

# Web tests

- Every unit and component test starts at `FROZEN_NOW` (`web/src/test/frozen-now.ts`). Before each test, the setup file fakes `Date` and makes every `Temporal.Now` method read that fake `Date`; after the test, it restores both. Timers stay real.
- Build a "future" date from `FROZEN_NOW`, never from the real clock (`FROZEN_NOW + 3 * 60 * 60 * 1000`). A typed calendar date is fine beside it when its text format is what the test checks.
- A test that needs another moment calls `vi.setSystemTime(…)`, which moves `Date` and `Temporal.Now` together; the next test starts at `FROZEN_NOW` again.
- Assert an absence ("nothing shown", "not called", "dialog gone") only after a positive signal proves the check ran: a visible element on the same render, or, after async work, a signal in the same `waitFor`/`findBy` (the "Looks good" mark, `aria-invalid="false"` on the fixed field, the restored radio option, the rule's own result). Without it, a broken path passes.
