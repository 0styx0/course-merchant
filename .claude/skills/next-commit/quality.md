# Quality checks

Used in steps 2–4 of [SKILL.md](SKILL.md). The overall checklist is [../_shared/definition-of-done.md](../_shared/definition-of-done.md).

## Test table (in the outline)

One row per behaviour the commit adds or changes:

| Behaviour | Happy paths | Failure cases | Edge cases |
|---|---|---|---|

- **Failure cases:** every documented way the behaviour can fail (invalid input, not allowed, not found, conflict, external call fails). Each gets a test.
- **Edge cases:** empty, boundary values, duplicates, repeated calls, null/missing values, ordering.
- Leave a cell empty only when it truly doesn't apply, and say why in a few words.
- Follow the test rules in `.claude/rules/` and the package CLAUDE.md files for where each kind of test lives.
- A test must be able to fail: assert on the outcome, not on "it ran".
- For a change of behaviour, write the tests first and run them against the untouched code; each must fail for the right reason before you implement.

## Structure

- Folders are named for their job; file names state everything the file exports; function names state what they return (CLAUDE.md *Conventions*).
- No cast exists only to make one caller's type fit another's, and no shared type forces sibling features to conform (CLAUDE.md *Code*). A comment-justified cast for a library type limit is fine.
- Reuse the helpers found in step 1; don't add a second copy.
- Count the files in every folder you touched; if it passes the limit in CLAUDE.md, group them in this commit.
- The diff holds only files the outline named. If it needs more, stop and ask.
- If the commit changes a contract or schema that generated code comes from, regenerate it (commands in CLAUDE.md). Never hand-edit generated files.

## When verification fails

- Fix failures your change caused. At most 3 attempts, then stop and report.
- If a failure was already there (run the same test on the untouched code to confirm), say so and leave it.
- If the fix needs a design or behaviour change, stop and ask.
- Never weaken, skip or delete a test to make it pass.
