# Quality checks

Used in the *Outline*, *Build* and *Verify* sections of [SKILL.md](SKILL.md). The overall checklist is [../_shared/definition-of-done.md](../_shared/definition-of-done.md).

## Test table (in the outline)

One row per behaviour the commit adds or changes:

| Behaviour | Happy paths | Failure cases | Edge cases |
|---|---|---|---|

- **Failure cases:** every documented way the behaviour can fail (invalid input, not allowed, not found, conflict, external call fails). Each gets a test.
- **Edge cases:** empty, boundary values, duplicates, repeated calls, null/missing values, ordering.
- Leave a cell empty only when it truly doesn't apply, and say why in a few words.
- Follow the test rules in `.claude/rules/` and the package CLAUDE.md files for where each kind of test lives.
- A test must be able to fail: assert on the outcome, not on "it ran".
- Write the tests first, as SKILL.md *Build* says.

## Structure

- Folders are named for their job; a file name states the file's main job; function names state what they return (CLAUDE.md *Conventions*).
- No cast exists only to make one caller's type fit another's, and no shared type forces sibling features to conform ([code.md](../../rules/code.md)). A comment-justified cast for a library type limit is fine.
- Reuse the helpers found in *Find the work*; don't add a second copy.
- Count the files in every folder you touched; if it passes the limit in CLAUDE.md, group them in this commit.
- The diff holds only files the outline named. If it needs more, stop and ask.
- If the commit changes a contract or schema that generated code comes from, regenerate it (commands in CLAUDE.md). Never hand-edit generated files.

## When verification fails

- Fix failures your change caused. At most 3 attempts, then stop and report.
- If a failure was already there (run the same test on the untouched code to confirm), say so and leave it.
- Never weaken, skip, merge or delete a test to make it pass or to meet a lint or size limit. A file that is too long is split into parts named for their topic, with shared set-up in a `<name>.fixtures.tsx` beside them (as `create-course/tests/` does).
