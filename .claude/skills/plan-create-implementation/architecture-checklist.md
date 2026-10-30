# Architecture checklist

Used in step 4 of [SKILL.md](SKILL.md). Answer each for the milestone; record only answers other commits depend on.

- **Boundaries:** which module owns each new responsibility? Does anything cross an existing module's edge?
- **Reuse:** which existing helper, type or component does each piece use (found by grep)? Name it. Add a new one only when none fits.
- **Shared definitions:** what do two or more commits share (data shape, error codes, names)? Define it in the earliest commit.
- **State:** is any value stored that can be derived? Prefer a constraint plus a shared query.
- **Failure paths:** for each behaviour, how can it fail, and what does the user or caller see? Decide it here if two commits depend on it. In a high-risk area ([../_shared/project.md](../_shared/project.md)) write a failure table, mandatory: `| Actor | Abuse or failure | What the system does | Test that pins it |`, covering at least duplicates and retries, out-of-order events, races, and the outside service being down or slow.
- **UI states** (UI milestones): for each field or component, decide and record:
  - what shows on first load, before any input;
  - while typing, and on a picker-only change with no blur;
  - invalid, then corrected (does the error clear at once?);
  - when an error appears or clears, does anything move or resize?;
  - where errors that involve two or more fields show;
  - at about 400 px, and keyboard-only.
  - The answers become the commit lines' test tables and the states walked in "Ran it" (see [../_shared/definition-of-done.md](../_shared/definition-of-done.md)).
- **Data model:** write the 3 to 5 queries the feature needs. Which constraints (unique, check, foreign key, not null) make an invalid state impossible to store? Which choice would need a migration of live data to change?
- **Limits and security:** input sizes, who may call it, what is logged.
- **Layout:** count files in every folder a commit adds to (the limit in CLAUDE.md, spec files count). Plan the grouping now.
- **Testability:** can each behaviour be tested without the next commit?
- **Cost of being wrong:** which choices are expensive to reverse (data model, public shapes)? Give those the most care.
