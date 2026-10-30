# Writing commit lines

Used in step 5 of [SKILL.md](SKILL.md). The format itself is in [../_shared/commit-line.md](../_shared/commit-line.md); this file is how to cut the milestone.

- **One outcome per commit,** stated first in plain words.
- **Cut by review unit, not by file.** A commit is what the owner can review and revert in one piece. Same-kind changes (moves, renames, lint fixes, test splits) are one mechanical commit per package, not one per file or folder.
- **Order:**
  1. shared definitions first (data shapes, helpers, config);
  2. then each slice end to end, thinnest first (a slice = one user-visible behaviour, built through every layer it needs, over a layer built across many slices);
  3. wiring into pages;
  4. browser tests and docs last.
- **Every commit is green and shippable alone:** build, lint and tests pass; nothing is left unused or half-wired that a later commit finishes (unless the line says "not used yet").
- **Tests live in the commit that adds the behaviour.** List the behaviours, naming failure and edge cases, so the outline's table is not invented later.
- **Mechanical flag:** only for commits that change no logic. If existing tests may not pin the touched lines, say "coverage first".
- **Dependencies:** a line says which commit it needs when the order is not obvious.
- **Folders:** if the commit adds files to a folder that would pass the files-per-folder limit in CLAUDE.md, the line includes the grouping.
- **A spike milestone** is one commit line flagged `*(spike)*`: no tests; the code is deleted or kept only if the answer needs it; it ends with the answer written in the doc and a proposed decision row.
- Leave out exact test code, file contents and names that can be chosen inside one commit.
