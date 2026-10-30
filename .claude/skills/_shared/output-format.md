# Output format rules

Used by `/next-commit` (outline and hand-off) and the planning skills (the presented plan). Moved out of the root CLAUDE.md so they load where they apply. The general writing rules (plain language, no coined terms, bullets, copyable commands) stay in CLAUDE.md *Writing*.

- **Diagram file moves.** When a refactor moves or splits files, show one diagram per folder in the outline and again in the hand-off. Put a heading line first, e.g. "`api/src/auth` (16 files → 6 in the folder, plus 2 new sub-folders)", then one code block with the old layout (`BEFORE`) on the left and the new one (`AFTER`) on the right, side by side, files of a new sub-folder listed in the same tree format. Unchanged folders are written as `(unchanged)`. Use `old -> new` arrows only when a single file splits.
- **Diagram control flow.** When a commit or milestone has logic (a branch for invalid input, a failure or a success), show a flow diagram in the outline, the hand-off and the plan. Format in [flow-diagram.md](flow-diagram.md).
- **Link files.** A list of files is a table or list of markdown links relative to the repo root, e.g. `[types.ts](api/types.ts#L12)`.
  - **Link each file once**, where the files are listed (the *What* table, the hand-off table), pointing at the first line of code or comment that isn't an import, or at the line the row is about. Check the line number with grep first; never guess it.
  - **In prose, format code names as code and don't link them**, unless the sentence is about one specific line.
  - **A file that doesn't exist yet** is written as plain code, with no link.
