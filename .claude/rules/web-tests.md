---
paths:
  - "web/**/*.test.ts"
  - "web/**/*.test.tsx"
  - "web/tests/**"
---

# Web tests

- Every unit and component test starts at `FROZEN_NOW` (`web/src/test/frozen-now.ts`): the setup file fakes `Date` before each test and restores the real clock after it. Timers stay real.
- Build a "future" date from `FROZEN_NOW`, never from the real clock (`FROZEN_NOW + 3 * 60 * 60 * 1000`). A typed calendar date is fine beside it when its text format is what the test checks.
- A test that needs another moment calls `vi.setSystemTime(…)`; the next test starts at `FROZEN_NOW` again.
