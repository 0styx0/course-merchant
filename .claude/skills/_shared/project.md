# Project facts

Everything the skills know about this repo that another repo would change. To reuse the skills elsewhere, copy `.claude/skills/` and `.claude/hooks/`, then rewrite this file and CLAUDE.md. The other skill files point here instead of naming packages, commands or limits.

- **Design docs:** `docs/<area>.md`, listed in CLAUDE.md under *Design docs*. The model to match is [auth.md](../../../docs/auth.md).
- **Areas of the codebase** (a commit stays in one): `api/`, `web/`.
- **Contract file:** `api/openapi/openapi-v1.yaml`. Regenerate commands are in CLAUDE.md *Contract-first API*; a hook blocks hand-edits of generated files.
- **High-risk areas** (a failure table in the plan, `/security-review` on every commit): payments (checkout, webhooks, fulfillment, refunds), auth, email.
- **Stack for the library check:** Node, NestJS 11, Next 16, React 19, Prisma 8 RC, Tailwind 4. Already used: Zod, Prisma, Stripe, Tiptap, shadcn/base-ui, vitest.
- **Files-per-folder limit:** set in CLAUDE.md *Conventions*, checked by [check-folder-file-count.sh](../../../.husky/check-folder-file-count.sh).
- **Run it:** the `run` skill; `yarn dev:mock` (web with mocked API); Playwright browser tests in `web/tests/`.
- **Commands:** lint, type check, tests and coverage are in each package's `package.json` and CLAUDE.md.
