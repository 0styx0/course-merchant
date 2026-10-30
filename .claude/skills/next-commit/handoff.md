# Hand-off format

Used in step 5 of [SKILL.md](SKILL.md). Keep it short, and write every summary by the *Bullets, not blocks* rule in CLAUDE.md (one short sentence per bullet, joined steps as sub-bullets, never a paragraph). The items:

- The files changed, as a table: links | high-level changes.
  - Each link points at the first changed function in that file, as `[file.ts](path/file.ts#L42)`.
  - The visible text is the file name only, with no line number. The line is only in the link target.
  - The line is where the function starts.
  - For a new file, use its first function.
  - When nothing in the file is a function (a doc or YAML), use the first modified line.
  - For moves, add the same per-folder BEFORE/AFTER diagrams as in the outline.
- The verification result.
  - When everything passes, a single line such as `Passed: lint, type check, unit, e2e`.
  - Detail a command only if it failed, with its output.
  - For API commits, also `Ran it: <what you did and saw>`. For UI commits, `Ran it: <the states walked in Chrome, what you saw>` and the GIF file name.
- `Deviations from the plan line: none`, or what differed and why (a file, a behaviour, a decision made on the way).
- `Reviews:` which of `/code-review` and `/security-review` ran.
  - Give each finding as fixed or rejected, with a reason.
- A suggested conventional commit message.
  - No body unless it needs one.
  - Written as a copyable command (see CLAUDE.md *Writing*), e.g. `` `refactor(web): split the course form into sections` ``.
- A reminder to run `/clear` before the next commit.

Then stop. The owner makes the commit.

If the work is part of a sequence, give the command for the next item as a copyable command, e.g. `/next-commit <module-name>`.
