# Library check

Used in step 2 of [SKILL.md](SKILL.md). CLAUDE.md says: use the library, and keep it simple. This is how to apply it while shaping the map. Search for specific things; no survey of the whole npm registry.

For each must-have and milestone, in this order:

1. **Already used?** Grep each package's `package.json` for the libraries already used (list in [../_shared/project.md](../_shared/project.md)), then the library's own official extensions (e.g. Tiptap's `CharacterCount`). Use it if it does the job.
2. **Would it be hand-rolled?** If the milestone would write parsing, validation, date or time-zone logic, rich text, queues, retries, auth tokens, rate limiting, file upload or the like, look for a library. Skip it for glue code of a few lines.
3. **Is the candidate reliable?** Check all of these, from the registry page, the repo and `node_modules` source, not from memory:
   - maintained: a release or commit in the last 12 months, issues answered;
   - used: weekly downloads in the hundreds of thousands or an official / well-known owner (the framework's team, Stripe, Vercel ...);
   - fits the stack: supports our versions (the stack in [../_shared/project.md](../_shared/project.md)) and ships its own types;
   - small: few dependencies, no native build step, license compatible with a public repo (MIT, Apache-2.0, ISC);
   - does the must-have: confirm the real behaviour in its docs or source (link it) and say how sure you are.
4. **Simpler overall?** Compare, in plain words: lines and files we would not write and maintain, against what the library costs us (a dependency to update, its learning curve, a limit we may hit). Choose the library only when it is clearly simpler. If it is close, prefer no new dependency.

Record each candidate for the picker as one row: name (linked), what it replaces, evidence it is reliable (one line), the cost, and the hand-rolled alternative with its cost. Say "not checked" for anything you could not verify.

A library the owner adopts becomes a *Decision* row (rejected: hand-rolling). If its behaviour is the riskiest unknown, give the map a small first milestone that proves it, with a *Done when* that decides it.
