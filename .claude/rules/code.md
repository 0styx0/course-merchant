---
paths:
  - "api/src/**"
  - "web/src/**"
  - "web/tests/**"
---

# Code rules

Moved out of the root CLAUDE.md so they load when you read or write source code. Naming and folder rules stay in CLAUDE.md *Conventions*.

- **Public library APIs only**, in code and tests: no undocumented error fields (e.g. `sqlState`) or private members; knip reports imports of packages we don't list. If the public API can't do it, say so and suggest alternatives.
- **Read the docs for each API.** Before writing code that calls a library API (Next, React, Nest, Prisma, Stripe, Tiptap, Zod or any other), read that API's own page in its docs: Next's guides in `web/node_modules/next/dist/docs/`, Prisma's in the skill folder named in [api-database.md](api-database.md), and the official site for the rest. Read the page for the API you are calling, not the whole docs folder.
- **Use the library, and keep it simple.** Before hand-writing logic, check whether a library we already use (or a small official extension of it, e.g. Tiptap's `CharacterCount`) does it, and use that. Remove code no caller or test needs, even if it is tidy or was written on purpose: a check for a state the types already rule out, a wrapper that only renames, an option nobody passes. Keep every check for input a caller can send. Simple and correct beats thorough. When a helper has to stay because the library can't be reached from where it runs, say why in a comment and guard it with a test against the library. If dropping something would change behaviour (e.g. what a request contains), ask first as usual.
- **Compose siblings; each owns its types.** Two features that do similar jobs (create and edit, two pages) each own their types, state, schema and hooks.
  - Shared pieces are generic over the caller's type. What differs (field names, children, callbacks) comes in as props.
  - A shared piece never names a field, route or type that belongs to one caller.
  - A cast whose only job is to make one caller's type fit another's is a design smell: restructure instead. A cast is fine only for a limit of a library's types, with a comment saying so.
  - **Share first, don't copy.** Before writing a block that matches one in a sibling (a hook, a section, a helper), extract the shared version and have both use it. A copy needs a stated reason.
- **Modular, not speculative.** Give real responsibilities and shared logic their own focused module, but add no interfaces or abstractions for hypothetical needs (e.g. no payment gateway interface). Spend design effort where change is expensive, the DB schema: choose constraints and history tables now, because migrating live data costs the most. A thin concrete wrapper around an SDK is fine.
- **Small composed functions/files/commits.** Every function, exported or not, reads as a short sequence of well-named steps, one function per outcome; lint caps its statements and complexity. Lint refuses `And` in a function name; split the function, or name its one job. If a body builds an object or array or runs a loop and also makes a decision, split it before writing on: pull each decision ("is this start already taken?", "how does this part read?") into its own small function. A switch is only a thin dispatch with one line per case. Plan commits the same way: one outcome each.
- **Simple ternaries only.** Lint rejects nested ones. Keep each side a short expression; when a branch is a multi-line object, array or JSX block, use an early `return` per case, `&&` or `??` for a default, or a small named function (or component, in JSX).
- **Flat and immutable by default.** Use `const` with `map`/`filter`, not `let` and a loop that pushes into an array (lint covers early returns and `prefer-const`). A small local `Set` or counter is fine when it is the simplest way to see earlier rows; say why in a comment.
- **Field names name their owner.** Nest or qualify fields by owner (`customer.name`, not `name` beside `courseId`), in contracts, types and variables.
- **Store each fact once.** Derive a value such as the current status with a shared query helper plus a DB constraint, instead of a column (e.g. `currentStatus`) beside the append-only status log. Raise denormalization only with a measured performance reason, and name its sync cost.
