# Commit line format

Written by `/plan-create-implementation`, read by `/next-commit` in its first step. One line, then at most five short sub-bullets. A reader should not need chat history.

```
- [ ] **3b.** <Outcome in plain words.> *(mechanical)* **Next**
  - Files: <links or paths, total count, folder counts if near 7>
  - Behaviours: <each behaviour, with the main failure and edge cases named>
  - Needs: <earlier commit, if not the one before>
  - Settled: <decision rows or sections that already cover the design>
  - Done when: <the check that proves it: tests, count, command>
```

- Label: number plus letter (3b). No other scheme.
- `*(mechanical)*` only when no logic changes; `/next-commit` still checks coverage first.
- `Behaviours` is the plan's input to the test table, not the table. `/next-commit` adds cases it finds.
- Omit a sub-bullet that is empty; never pad.
