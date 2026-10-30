---
paths:
  - "api/src/**"
  - "web/src/**"
---

# Code rules

Moved out of the root CLAUDE.md so they load when you read or write source code. Naming and folder rules stay in CLAUDE.md *Conventions*.

- **Public library APIs only**, in code and tests: no undocumented error fields (e.g. `sqlState`), transitive-only exports or private members. If the public API can't do it, say so and suggest alternatives.
- **Use the library, and keep it simple.** Before hand-writing logic, check whether a library we already use (or a small official extension of it, e.g. Tiptap's `CharacterCount`) does it, and use that. Remove code that isn't needed for correctness, even if it is tidy or was written on purpose. Simple and correct beats thorough. When a helper has to stay because the library can't be reached from where it runs, say why in a comment and guard it with a test against the library. If dropping something would change behaviour (e.g. what a request contains), ask first as usual.
- **Compose siblings; never fit them to a shared type.** Two features that do similar jobs (create and edit, two pages) each own their types, state, schema and hooks.
  - Shared pieces are generic over the caller's type. What differs (field names, children, callbacks) comes in as props.
  - A shared piece never names a field, route or type that belongs to one caller.
  - A cast whose only job is to make one caller's type fit another's is a design smell: restructure instead. A cast is fine only for a limit of a library's types, with a comment saying so.
  - **Share first, don't copy.** Before writing a block that matches one in a sibling (a hook, a section, a helper), extract the shared version and have both use it. A copy needs a stated reason.
- **Modular, not speculative.** Give real responsibilities and shared logic their own focused module, but add no interfaces or abstractions for hypothetical needs (e.g. no payment gateway interface). Put flexibility where change is expensive: the DB schema. A thin concrete wrapper around an SDK is fine.
- **Small composed functions/files/commits.** Every function, exported or not, reads as a short sequence of well-named steps, one function per outcome. If a body mixes a loop, a branch and a data shape, split it before writing on: pull each decision ("is this start already taken?", "how does this part read?") into its own small function. A switch is only a thin dispatch with one line per case. The same with planning commits/work.
- **Simple ternaries only.** ESLint rejects nested ones. Keep each side a short expression (a name, a call, a literal); the formatter may wrap it over lines. When a branch is a multi-line object, array or JSX block, use an early `return` per case, `&&` or `??` for a default, or a small named function (or component, in JSX).
- **Flat and immutable by default.** Early returns instead of nesting; `const` with `map`/`filter` instead of `let` and a loop that pushes into an array. A small local `Set` or counter is fine when it is the simplest way to see earlier rows; say why in a comment.
- **Unambiguous labels.** Nest or qualify fields by owner (`customer.name`, not `name` beside `courseId`), in contracts, types and variables.
- **Don't duplicate state.** Don't add a column that duplicates derivable state (e.g. a `currentStatus` beside the append-only status log). Prefer a DB constraint plus a shared query helper; raise denormalization only with a measured performance reason, and name its sync cost.
