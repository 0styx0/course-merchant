# Architecture checklist

Used in step 4 of [SKILL.md](SKILL.md). Answer each for the milestone; record only answers other commits depend on.

- **Boundaries:** which module owns each new responsibility? Does anything cross an existing module's edge?
- **Reuse:** which existing helper, type or component does each piece use (found by grep)? Name it. Add a new one only when none fits.
- **Shared definitions:** what do two or more commits share (data shape, error codes, names)? Define it in the earliest commit.
- **State:** is any value stored that can be derived? Prefer a constraint plus a shared query.
- **Failure paths:** for each behaviour, how can it fail, and what does the user or caller see? Decide it here if two commits depend on it.
- **Limits and security:** input sizes, who may call it, what is logged.
- **Layout:** count files in every folder a commit adds to (7 maximum, spec files count). Plan the grouping now.
- **Testability:** can each behaviour be tested without the next commit?
- **Cost of being wrong:** which choices are expensive to reverse (data model, public shapes)? Give those the most care.
