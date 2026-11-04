# Test reliability

Read this before changing how the repo's tests run, wait, fake time or get checked by lint. It records what the code can't tell you: what the 2026-11-04 audit found, the order of the fixes, and why.

It relates to [web.md](web.md) (component and browser tests), the API test rules in [api-tests.md](../.claude/rules/api-tests.md) and the git hooks in [.husky/](../.husky/).

Run it with `/plan-create-implementation docs/test-reliability.md` ([skill](../.claude/skills/plan-create-implementation/SKILL.md), which splits one milestone into commits), then `/next-commit docs/test-reliability.md` ([skill](../.claude/skills/next-commit/SKILL.md), which builds one commit).

Keep this file current **in the same commit as the work**: tick the step, and mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it becomes the next one. Milestone N is described in the section *Step N* below.

- [x] **1. A test comparing two times fails when they differ.** Today any two times match inside an object check, so some assertions check nothing.
  - [x] **1a.** Object checks in every API suite fail on two different times; the `markSent` and create-course tests now compare real values.
  - [x] **1b.** Object checks in web unit and component tests fail on two different times, through the web's own copy of the tester.
- [-] **2. Two checkouts can run every suite at once.** Dropped by the owner on 2026-11-04: `.env.test` overrides every shell setting, so per-checkout ports need a loader across five files. A second checkout still shares the main checkout's test containers.
- [ ] **3. Unit and integration tests keep their own clock and finish in time.** No test depends on today's date, a sleep or the 5-second default timeout, and no test leaks a mock into the next. Planned as 9 commits (one per kind of fix per package):
  - [x] **3a (api).** API tests build "future" dates from a clock, and none of them sleeps; the API unit, integration and end-to-end suites pass.
  - [x] **3b (web).** Web tests start at one frozen time (2026-11-04 12:00 UTC); a test can still set its own.
  - [ ] **3b2 (web).** The three web tests that install their own 2026-11-03 clock start at the frozen time instead. **Next**
    - *Behaviours*:
      - The edit-form schedule and saving tests and the prices action test drop their own fake clock and build their times from `FROZEN_NOW`.
      - The `remembered-course` and `remembered-handlers` tests keep their clocks, because they set a saved-at time on purpose.
    - *New shared pieces*: none.
    - *Files*: the three tests above (`edit-course-form.schedule.test.tsx`, `edit-course-form.saving.test.tsx`, `save-edited-details.action.prices.test.ts`).
    - *Done when*: `yarn --cwd web test:unit` passes and none of the three calls `useFakeTimers`.
  - [ ] **3c (web).** A web test asserts "nothing shown" only after something visible proves the check ran.
    - *Behaviours*:
      - Each offender awaits a positive signal first.
      - Break it once: reverting the code behind an absence check fails its test.
    - *New shared pieces*: none.
    - *Files*:
      - the offending tests (list them first with `git grep -nE 'queryBy|not\.toBeInTheDocument|not\.toHaveBeenCalled' -- web/src`; re-plan when the list passes about 12 files)
      - `web-tests.md` (absence rule)
    - *Done when*: the web suite passes and each fixed test fails when its code is reverted.
  - [ ] **3d (api).** An API test can no longer leak a mock into the next.
    - *Behaviours*:
      - `restoreMocks`, `unstubEnvs` and `unstubGlobals` are on in the 3 API Vitest configs.
      - The hand-written `vi.restoreAllMocks` calls are gone.
      - A test that leaned on a leaked mock gets fixed.
    - *New shared pieces*: none.
    - *Files*: the 3 API Vitest configs and the specs with hand restores.
    - *Done when*: the API suites pass.
  - [ ] **3e (web).** A web test can no longer leak a mock into the next.
    - *Behaviours*:
      - The same three settings go into `web/vitest.config.mts`.
      - The hand restores are gone.
      - `web-tests.md` says spies restore themselves.
    - *New shared pieces*: none.
    - *Needs*: 3c
    - *Done when*: the web suite passes.
  - [ ] **3f (api).** API tests run in `Pacific/Chatham`, so a test that assumes UTC fails on every machine.
    - *Behaviours*:
      - `env: { TZ }` is set in the 3 API Vitest configs, and exposed tests are fixed.
      - The unit suite passes once under `TZ=Pacific/Kiritimati`.
    - *New shared pieces*: none.
    - *Done when*: the API suites pass.
  - [ ] **3g (web).** Web tests run in the same zone.
    - *Behaviours*:
      - `env: { TZ }` goes into the web config, and exposed tests are fixed.
      - The web suite passes once under `TZ=Pacific/Kiritimati`.
    - *New shared pieces*: none.
    - *Needs*: 3b
    - *Done when*: the web suite passes.
  - [ ] **3h (web).** Heavy web form tests finish under load.
    - *Behaviours*:
      - A 15-second `testTimeout` goes into the web config.
      - The unit suites pass 5 times under `--sequence.shuffle`, once under Kiritimati, and once on a busy machine with no 5-second timeouts.
    - *New shared pieces*: none.
    - *Done when*: those runs pass; the milestone's *Retro* is added.
- [ ] **4. Browser tests wait for the page.** Layout checks retry until they hold, tests type only once the page is ready, and the course list's loading-state test stops racing a timer.
- [ ] **5. Lint rejects the patterns behind the flakes.** Test files can't read the real clock, sleep, or read a layout value once, unless a comment says why.
- [ ] **6. The commit hook skips tests a change can't affect, and checks both packages together.** A CSS-only commit no longer runs a whole suite, and the checks before push stay the same.
- [ ] **7. One command stresses the suites on demand.** It runs shuffled, time-zone and repeated runs, so a new flake shows up before it reaches a commit.

## Terms

- **Flaky test:** a test that passes and fails on the same code.
- **Hollow assertion:** a check that passes whatever the code does, so no bug can fail it. Example: `expect({ sentAt: stored }).toMatchObject({ sentAt: other })` passes for any two Temporal times, even `2020-01-01` against `2030-01-01`.
- **Temporal value:** a time object from the Temporal library that both packages use (`Instant`, `PlainDate`).
- **Equality tester:** a function Vitest asks whether two values are equal, registered with `expect.addEqualityTesters`. Without one for Temporal, `toMatchObject` calls any two times equal.
- **Frozen clock:** a test that fixes "now" to one time, with `vi.useFakeTimers` or a spy on `Temporal.Now`, so its result never depends on the day it runs.
- **Hydration:** React attaching to the page the server sent. Typing or clicking before it finishes can be lost.
- **Web-first assertion:** a Playwright check, `expect(locator)…`, that retries until it holds or times out. A plain `expect(number)` reads once.
- **Poll:** Playwright's `expect.poll(fn)`, which reruns a function until its value passes.
- **Gated handler:** a mock API handler that waits on a promise the test releases, so the test decides when the answer arrives. A delay handler guesses a time instead.
- **Shuffle:** Vitest's `--sequence.shuffle`, which runs tests in a random order to expose order dependence.
- **Worktree:** a second checkout of the same repo, made with `git worktree add`.
- **Vitest project:** one entry in a Vitest config with its own environment, such as `node` or `jsdom`.
- **Twin code:** existing code that does the same job in another place, so a change must reach both. Example: [vitest.config.mts](../web/vitest.config.mts) in `web/` and the three `vitest.*.config.ts` files in `api/`.
- **Break it once:** revert the line a new test covers, and watch the test fail for the reason its name gives.
- **Re-measure:** a command that gives today's value of a fact that changes, so the doc holds no stale count.

## Mocks and commands

- **Run one API spec:** use the forms in [api/CLAUDE.md](../api/CLAUDE.md) *Tests*.
- **Repeat the browser suite:**
  `yarn --cwd web playwright test --repeat-each=3 --workers=8`
- **Shuffle the web unit tests:**
  `yarn --cwd web vitest run --sequence.shuffle`
- **Shuffle the api unit tests:**
  `yarn --cwd api vitest run --config vitest.unit.config.ts --sequence.shuffle`
- **Use another time zone:** prefix any test command with `TZ=Pacific/Kiritimati`.

## Principles

- **A test must be able to fail.** Each new assertion gets a "break it once" check. This is the TDD red step, applied to every assertion.
- **A test controls its own time.**
  - "Now" comes from a frozen clock.
  - A "future" date is built from the frozen clock (`utcIn(24)` gives 24 hours from now). A typed calendar date appears only beside a frozen "now", and only when its text format is what the test checks.
  - Times that Postgres stamps come from `DatabaseClock` (see [api/CLAUDE.md](../api/CLAUDE.md) *Clock*).
- **Read a value that can still change inside a retry.** A check on layout, validation or a font uses a retrying assertion, never a single read.
- **Assert an absence only after a positive signal.** "No error shown" counts only once something visible proves the check ran.
- **Each checkout owns its test resources.** Containers, ports and databases come from settings, with today's values as defaults.
- **Fix before enforce.** A lint rule or a stricter setting lands after the commits that fix what it would reject, so every check starts green. A rule that landed first would fail the commit hook for everything it finds.
- **Speed never removes a check.** The hook skips a test only when the test can't see the changed file. The full suites still run before every push and in CI.

## Numbers

Measured on 2026-11-04 in a separate worktree, on a busy 8-core machine (load average 9–17), so the durations run long.

| Fact | Value | Command |
|---|---|---|
| Playwright failures over 3 repeats | 8 of 225, all in the "save bar" block | `yarn --cwd web playwright test --repeat-each=3 --workers=8` |
| Tests that fail once times compare strictly | 2 | milestone 1's tester, then `yarn --cwd api test:integration` and `yarn --cwd api test:e2e` |
| Web unit run | 58 s | `yarn --cwd web test:unit` |
| API unit run | 27–48 s | `yarn --cwd api test:unit` |
| API integration run | 185 s | `yarn --cwd api test:integration` |
| API end-to-end run | 74 s | `yarn --cwd api test:e2e` |
| Web related tests for one `.ts` file | 27 s | `yarn --cwd web test:unit:related <file>` |
| Web related tests for one CSS file | 1.3 s | `yarn --cwd web test:unit:related <css file>` |

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| One shared Temporal equality tester, in a setup file every Vitest config loads | It fixes every current and future object check on a time in one place, so a developer who forgets the rule still gets a failing test | Rewriting each assertion to `toEqual` (each new one can slip back); a lint rule (lint can't see value types) |
| Test inputs rounded to database precision with the existing `toDatabasePrecision` | Postgres keeps microseconds and `Temporal.Now` gives more digits, so the strict tester would otherwise fail correct code | Comparing to the millisecond (hides a real rounding bug) |
| The time tester decides whenever either value is a Temporal value, and a Temporal value never equals its text | A test that compares an API response's text time against an `Instant` otherwise passes for any time, as the create end-to-end test did | Deciding only when both values are Temporal (small, but leaves text-against-time checks hollow); turning text into Temporal before comparing (a few more lines, and hides a response that sends a time in the wrong format) |
| The web setup file freezes `Date` before every test | Tests build future dates from one known "now", so none depends on the day it runs, and a test sets its own time only when it needs one | A freeze in each file that needs one (a line per file, and a new test can forget it) |
| `restoreMocks`, `unstubEnvs` and `unstubGlobals` on in every Vitest config | A failed test no longer leaks its mock into the tests after it | An `afterEach` in each file (easy to forget) |
| `Pacific/Chatham` (+12:45, an offset no common machine uses) pinned for Vitest and for Playwright's `timezoneId`; the stress command also runs `Pacific/Kiritimati` (+14:00) | A test that assumes UTC or the developer's own zone fails on every machine, instead of only on some | Leaving the zone to the machine (today's tests pass by luck); pinning UTC (hides tests that assume UTC) |
| A 15-second timeout for web unit tests | The heavy form tests pass alone but hit the 5-second default under load | Raising the timeout per test (a growing list); cutting the typing in each test first (worth doing later, but bigger) |
| Browser layout and font checks go through `expect.poll` and `document.fonts.ready` | A single read right after a scroll or a focus lost to late layout | `waitForTimeout` (a guess); `networkidle` (waits for neither layout nor fonts) |
| Lint bans real clocks in test files outright, and a line that needs real time carries `eslint-disable-next-line` with its reason | A list of exempt files goes stale, while a comment sits on the line it excuses | Per-file exemption lists; detecting a frozen clock (lint can't) |
| The stress command runs on demand (weekly, or before a release) and never in a hook | Shuffled, repeated and zone runs take many minutes | Running it before every push |

## Step 1. A test comparing two times fails when they differ

- **Why here:** it is the biggest finding, and the thinnest path through every layer (one setup file, four configs). Later milestones add runs that this check must already guard.
- **Needs:** none.
- **Builds on:**
  - Vitest's [`expect.addEqualityTesters`](https://vitest.dev/api/expect.html#expect-addequalitytesters).
  - `toDatabasePrecision` in [test-helpers.ts](../api/src/test/test-helpers.ts).
  - The configs [vitest.unit.config.ts](../api/vitest.unit.config.ts), [vitest.integration.config.ts](../api/vitest.integration.config.ts), [vitest.e2e.config.ts](../api/vitest.e2e.config.ts) and [vitest.config.mts](../web/vitest.config.mts).
  - Twin code: the api and web setup files. The API uses the `@js-temporal/polyfill` package and the web uses `temporal-polyfill`. The tester matches on the object's type tag (`Object.prototype.toString`, which starts with `[object Temporal.`) plus its text form, so it covers both without importing either.
  - Setup file: one file per package, because `api/` and `web/` share no source. `api/src/test/temporal-equality.ts` is listed in all three API configs: the unit config gains its first `setupFiles` entry, and the integration and end-to-end configs list it before `integration.setup.ts` (which opens the database and wipes every table, so the unit suite must not load it). `web/src/test/temporal-equality.ts` sits beside `setup.ts` in the web config. Each copy gets its own unit test.
- **Size:** 2 commits, one per package (a commit may not span `api/` and `web/`). The two exposed tests and the `api-tests.md` rules join the API commit, because the tester exposes them and the rules describe it.
- **Risk:** the tester must call different Temporal kinds unequal, and must leave every non-Temporal comparison unchanged.
- **Done when:**
  - Every unit, integration and end-to-end suite passes.
  - A unit test shows that an object check on two different instants fails.
  - Changing the `sentAt` that `markSent` stores in [email-outbox.repository.ts](../api/src/email/outbox/email-outbox.repository.ts) fails its test (break it once).
- **Also in this milestone:** [api-tests.md](../.claude/rules/api-tests.md) gains two rules, as bullets in its existing list:
  - Compare times with `toEqual`, or with `toMatchObject` under the shared tester.
  - Round test inputs with `toDatabasePrecision`.
- **Can wait:** the setup file's name and folder.
- **Re-measure:** the unit specs that mix Temporal values with object checks:
  `git grep -l Temporal -- 'api/src/**/test/unit/**' | xargs grep -l 'toMatchObject\|objectContaining'`
- **Retro:**
  - Planned 2 commits, shipped 2 (1a for the API, 1b for the web).
  - The owner changed nothing after use; no page ships in this milestone.
  - The web suite exposed no hollow test, so the rule "break it once" caused no friction here.

## Step 2. Two checkouts can run every suite at once

- **Why here:** every later milestone gets stress-run, and a run in a worktree must leave the main checkout's database and dev server alone.
- **Needs:** none.
- **Builds on:**
  - [docker-compose.test.yaml](../api/docker-compose.test.yaml), [api/.env.test](../api/.env.test) and the `db:test:up` script in [api/package.json](../api/package.json).
  - [playwright.config.ts](../web/playwright.config.ts) and [ci.yml](../.github/workflows/ci.yml).
  - Twin code: api integration and end-to-end tests share one database and one compose file.
- **Size:** 2 commits:
  - containers and the database address;
  - the Playwright port, no server reuse, and `forbidOnly` in CI.
- **Risk:** CI and the README name today's ports, and the defaults must keep both working.
- **Done when:**
  - A worktree with another project name and other ports runs `test:integration` while the main checkout runs it too, and both pass.
  - The browser suite passes while a dev server holds port 3000.
- **Blocks the split:** none.
- **Can wait:** the setting names.
- **Re-measure:** the places that name today's ports:
  `git grep -nE '5433|12111|localhost:3000' -- . ':!*.lock'`

## Step 3. Unit and integration tests keep their own clock and finish in time

- **Why here:** it fixes what milestone 5's lint rules would reject. Each stricter setting arrives with the fixes it needs (*Fix before enforce*).
- **Needs:** 1.
- **Builds on:**
  - `utcIn` in [course-request-schemas.fixtures.ts](../api/src/courses/test/unit/schemas/course-request-schemas/course-request-schemas.fixtures.ts).
  - `DatabaseClock` ([api/CLAUDE.md](../api/CLAUDE.md) *Clock*).
  - The frozen-date pattern in [edit-course-form.schedule.test.tsx](../web/src/features/admin-courses/edit-course/tests/edit-course-form.schedule.test.tsx).
  - Twin code: the integration specs that spy on `Temporal.Now` share one fixed time.
- **Size:** 5 commits, one per kind of fix:
  1. Clock fixes: literal future dates, real-clock reads and the sleep. This commit also adds the clock rules to `.claude/rules/` (the files that tell Claude how to write tests).
  2. Absence checks moved after a positive signal.
  3. Hand restores removed, then `restoreMocks`, `unstubEnvs` and `unstubGlobals` turned on.
  4. The pinned time zone, with whatever tests it exposes.
  5. The 15-second web timeout.
- **Risk:** the pinned zone and `restoreMocks` can expose tests that lean on today's behaviour. Each of those commits starts by running the suites to list them.
- **Done when:**
  - The unit suites pass five times under shuffle, and once under `TZ=Pacific/Kiritimati`.
  - A shuffled web run on a busy machine shows no 5-second timeouts.
- **Also in this milestone:**
  - A new `.claude/rules/web-tests.md`, loaded for `web/**/*.test.ts*` and `web/tests/**`, with three rules: freeze time, restore mocks in hooks, and assert an absence after a positive signal.
  - [api-tests.md](../.claude/rules/api-tests.md) gains three rules:
    - Write "future" as `utcIn()` or a frozen clock.
    - Freeze `Temporal.Now` in `beforeEach`.
    - Use *Clock* for times Postgres stamps.
- **Can wait:** which specs take their fixed time from the database clock.
- **Design notes *(temporary)*:**
  - The order is clocks, absence checks, mock restoring, zone, timeout. Each commit starts by running the suites to list what its change exposes, and re-plans when more than about 12 test files need a fix.
  - `web-tests.md` is created in 3b and grows in 3c and 3e; `api-tests.md` gains its rules in 3a.
  - Vitest's `test.env.TZ` sets the zone inside test workers (checked 2026-11-04 in `web/` with `Pacific/Chatham`).
  - The size is 8 commits, not 5: a commit cannot span `api/` and `web/`, and zone fallout would mix with mock-restoring fallout.

## Step 4. Browser tests wait for the page

- **Why here:** the audit's only reproduced browser flakes live here (see *Numbers*), and milestone 5's browser lint rules would reject the same code.
- **Needs:** none. Milestone 2 is dropped, so a repeated run needs the dev server stopped first.
- **Builds on:**
  - [edit-course.spec.ts](../web/tests/browser/admin-courses/edit-course.spec.ts), [fill-valid-course-form.ts](../web/tests/browser/admin-courses/fill-valid-course-form.ts), [list-courses.spec.ts](../web/tests/browser/courses/list-courses.spec.ts) and [fonts.spec.ts](../web/tests/browser/site-look/fonts.spec.ts).
  - `coursesSlow` in [list-courses.ts](../web/src/mocks/handlers/list-courses.ts).
  - Twin code: the create and edit specs share `fillValidForm`.
- **Size:** 4 commits:
  1. A shared helper that opens a page and waits until a known control is enabled (the Bold button of the description editor on the create page).
  2. The checks on the save bar (the `data-testid="save-bar"` strip in [edit-course-form.tsx](../web/src/features/admin-courses/edit-course/edit-course-form.tsx)) moved into polls.
  3. The loading-state test moved to a gated handler.
  4. The font checks, with Playwright's `timezoneId` and `locale` pinned.
- **Risk:** the edit page needs its own "ready" control. The create page has the editor toolbar.
- **Done when:** this command passes with no failures:
  `yarn --cwd web playwright test --repeat-each=5 --workers=8`
- **Also in this milestone:** `web-tests.md` gains the browser rules:
  - Wait for the page to be ready before typing.
  - Use web-first assertions.
  - Read layout inside `expect.poll`.
  - Gate slow handlers.
- **Blocks the split:** none.
- **Can wait:** the helper's name.
- **Re-measure:** the Playwright command in *Numbers*.

## Step 5. Lint rejects the patterns behind the flakes

- **Why here:** it comes after milestones 3 and 4, so each rule starts with no violations (*Fix before enforce*).
- **Needs:** 3, 4.
- **Builds on:**
  - The Vitest blocks in [api/eslint.config.mjs](../api/eslint.config.mjs) and [web/eslint.config.mjs](../web/eslint.config.mjs).
  - [.lintstagedrc.json](../.lintstagedrc.json).
  - Twin code: the two ESLint configs repeat the same Vitest rules.
- **Size:** 3 commits:
  1. Built-in `no-restricted-syntax` rules against real clocks and against reading a layout value once inside `expect`, with a reasoned disable comment on each line that needs real time.
  2. The plugin for component tests.
  3. The plugin for Playwright.
- **Risk:** both plugins are new dependencies, and the library check hasn't been run on either yet. This milestone's planning pass runs it, with the criteria in [library-check.md](../.claude/skills/plan-create-overview/library-check.md) (maintained, used, fits the stack, small, simpler overall), on [eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library) and [eslint-plugin-playwright](https://github.com/mskelton/eslint-plugin-playwright). If either fails, it falls back to the built-in rules alone.
- **Done when:**
  - `yarn --cwd api lint` and `yarn --cwd web lint` print nothing.
  - A scratch test using `Date.now()`, a single layout read inside `expect`, or `waitForTimeout` fails lint.
- **Scope:** the rules cover test files only. Production code, `web/src/mocks/` (which `dev:mock` runs) and generated code stay outside them.
- **Blocks the split:** none.
- **Can wait:** each plugin's exact rule list.
- **Re-measure:**
  - Lines that need a reasoned disable comment:
    `git grep -nE 'Date\.now|new Date\(\)|Temporal\.Now' -- 'api/src/**/test/**' 'api/src/test/**' 'web/src/**/*.test.ts*' 'web/tests'`
  - Lint results:
    `yarn --cwd web lint`
    `yarn --cwd api lint`

## Step 6. The commit hook skips tests a change can't affect, and checks both packages together

- **Why here:** a faster hook must not hide flakes, so it comes after the suites are steady. The web config split has to carry over the settings that milestones 1 and 3 add.
- **Needs:** 1, 3.
- **Builds on:**
  - [pre-commit](../.husky/pre-commit) (`needs_full_suite`, `run_unit_tests`), [pre-push](../.husky/pre-push) and [check-changed.sh](../.husky/check-changed.sh).
  - [vitest.config.mts](../web/vitest.config.mts).
  - Twin code: the api and web branches of the hook.
- **Size:** 3 commits:
  1. Skip the full unit suite when only CSS, Markdown or image files are staged.
  2. Run the two packages in parallel.
  3. Split the web config into `node` and `jsdom` projects. Each project inherits the shared setup file and settings.
- **Risk:** the gain from the split is unmeasured, so its commit records the time before and after. The owner drops it if the saving is small.
- **Done when:**
  - A CSS-only commit runs no unit suite.
  - A commit touching both packages finishes faster than the two runs added up.
  - A commit touching a config file or `.env.test` still runs the full suite.
- **Blocks the split:** none.
- **Can wait:** how the hook reports a failing background run.
- **Re-measure:** time `sh .husky/pre-commit` with a CSS change staged, then with a `.ts` change staged.

## Step 7. One command stresses the suites on demand

- **Why here:** it needs steady, isolated suites. Otherwise it only reports failures we already know about.
- **Needs:** 3, 4.
- **Builds on:** the commands in *Mocks and commands*, and the scripts in each `package.json`.
- **Size:** 2 commits:
  - the script;
  - its row in the README's test table.
- **Risk:** how long one full stress pass takes.
- **Done when:** the command runs the shuffled unit suites, three time-zone runs and a repeated Playwright run, and exits non-zero on any failure.
- **Blocks the split:** none.
- **Can wait:** the script's name, and whether it lives at the root or per package.
- **Re-measure:** time the command.

## Out of scope

- Changes to `/next-commit` and CLAUDE.md, including listing this doc under *Design docs*.
- A "hydrated" marker in the app, until a browser test has no control it can wait for.
- Cutting the typing cost inside each heavy form test.
- Making Postgres-stamped times and `Temporal.Now` agree outside the two-clocks cases in milestone 3.
- Visual-regression screenshots.
