# Commit line format

Written by `/plan-create-implementation`, read by `/next-commit` in its first step. One line, then a sub-bullet per field, and **one nested bullet per item** inside each field. Never join items with `;` or write a field as a paragraph. A reader should not need chat history.

```
- [ ] **3b.** <Outcome in plain words.> *(mechanical)* **Next**
  - *Files*:
    - <link or path> (<short note, if any>)
    - <link or path>
    - <folder counts, if near 7>
  - *Behaviours*:
    - <one behaviour, with its failure or edge case named; for a failure, the error code or message the caller sees>
    - <next behaviour>
  - *Needs*: <earlier commit, if not the one before>
  - *Settled*: <decision rows or sections that already cover the design>
  - *Done when*: <the check that proves it: tests, count, command>
```

- A note that qualifies an item goes in parentheses after it, or as a deeper bullet under it when it is long. Keep each bullet to one idea.
- A single short item (*Needs*, *Settled*, *Done when*) may stay on the field's own line; with two or more items, nest them.

- Label: number plus letter (3b). No other scheme.
- `*(mechanical)*` only when no logic changes; `/next-commit` still checks coverage first.
- `Behaviours` is the plan's input to the test table, not the table. `/next-commit` adds cases it finds.
- Omit a sub-bullet that is empty; never pad.
- The same layout applies to the commit lines in the doc and to the presented plan.
- The outcome line says what the admin, customer or developer can now do, in plain words. It names no function, type or file.
