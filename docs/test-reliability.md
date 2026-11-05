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
- [ ] **3. Unit and integration tests keep their own clock and finish in time.** No test depends on today's date, a sleep or the 5-second default timeout, and no test leaks a mock into the next. Split into commits, one per kind of fix per package:
  - [x] **3a (api).** API tests build "future" dates from a clock, and none of them sleeps; the API unit, integration and end-to-end suites pass.
  - [x] **3b (web).** Web tests start at one frozen time (2026-11-04 12:00 UTC); a test can still set its own.
  - [x] **3b2 (web).** The edit-form schedule and saving tests and the prices action test start at the frozen time and build their times from it.
  - [x] **3c (web).** A web test asserts "nothing shown" only after something visible proves the check ran; each fixed test fails when the code it guards breaks. The prices zone test now uses a time that has passed in New York and lies ahead in Los Angeles, so only the zone change clears its error.
  - [x] **3b3 (web).** Web tests read the frozen time from `Temporal.Now` too, on Node builds that include Temporal (CI) and on builds that leave it out.
  - [x] **3d (api).** An API test can no longer leak a mock into the next: the three API Vitest configs restore spies and stubs after each test, and the hand-written restores are gone.
  - [x] **3e (web).** A web test can no longer leak a mock into the next: the web Vitest config restores spies and stubs after each test, and the hand-written restores are gone.
  - [x] **3f (api).** API tests run in `Pacific/Chatham` unless the shell sets `TZ`; no existing test needed a fix.
  - [x] **3g (web).** Web tests run in `Pacific/Chatham` unless the shell sets `TZ`; no existing test needed a fix.
- [ ] **4. Browser tests wait for the page.** Layout checks retry until they hold, tests type only once the page is ready, and the course list's loading-state test stops racing a timer. Split into commits, one per kind of fix:
  - [x] **4a.** Admin form tests open their page through one helper that waits for the Bold button, so typing starts after the page has attached its scripts. The re-run found 3 slow-save failures in 170 runs, so the plan needs a commit for them.
  - [ ] **4b.** The Save bar and phone-width card checks retry until the layout settles.
    - *Behaviours*:
      - Each save-bar position check reads both boxes inside one `expect.poll`: the bar inside the screen, the last price above the bar, a focused field above the bar, and a chosen field below the error box.
      - The save-bar block opens the page through 4a's helper and drops `networkidle`.
      - The create page's "legend inside its card" and "no sideways scroll" checks poll.
      - Break it once: removing `scroll-mb-24` in the app makes the focus check time out and print the numbers it measured.
      - `web-tests.md` gains: read layout inside `expect.poll`.
    - *New shared pieces*: none.
    - *Files*: [edit-course.spec.ts](../web/tests/browser/admin-courses/edit-course.spec.ts), [create-course.spec.ts](../web/tests/browser/admin-courses/create-course.spec.ts), [web-tests.md](../.claude/rules/web-tests.md)
    - *Needs*: 4a
    - *Settled*: the decision row "Browser layout and font checks go through `expect.poll`…".
    - *Done when*: edit-course.spec.ts passes `--repeat-each=5 --workers=8`.
  - [ ] **4c.** The course list's loading test and the free enrollment's "Sending…" test decide when the mock answers.
    - *Behaviours*:
      - list-courses.ts gains a factory, called in each test, that returns a gated handler and its release function. The handler answers only after the release.
      - The loading test sees "Loading courses...", releases, then sees the first course.
      - start-checkout.ts gains the same kind of factory. The enrollment test sees "Sending…" busy, releases, then sees "Check your email".
      - Each test releases in a `finally`, so a failed test leaves no server render hanging.
      - The delay scenarios stay for `dev:mock`, and `coursesSlow` loses its `export`.
      - Break it once: with no release, the test times out on the course heading.
      - `web-tests.md` gains: gate a slow mock answer with a promise, never a delay.
    - *New shared pieces*: none. Each mock file owns its factory, built on `Promise.withResolvers`.
    - *Files*: [list-courses.ts](../web/src/mocks/handlers/list-courses.ts), [start-checkout.ts](../web/src/mocks/handlers/start-checkout.ts), [list-courses.spec.ts](../web/tests/browser/courses/list-courses.spec.ts), [free-enrollment.spec.ts](../web/tests/browser/courses/free-enrollment.spec.ts), [web-tests.md](../.claude/rules/web-tests.md)
    - *Settled*: the decision row on gated mock answers.
    - *Done when*: both specs pass `--repeat-each=5 --workers=8`.
  - [ ] **4d.** Font and size checks wait until the style applies.
    - *Behaviours*:
      - fonts.spec checks family, weight and size with `toHaveCSS`, which retries, including after a viewport change.
      - controls.spec checks the 48 px heights and the dialog title's font with `toHaveCSS`. The `--card` fill check polls.
      - The "no Google fonts" test keeps `networkidle` and `document.fonts.ready`, because it counts requests.
      - Break it once: changing the title's size class in the app fails the check, which prints the real value.
      - `web-tests.md` gains: check styles with web-first assertions.
    - *New shared pieces*: none.
    - *Files*: [fonts.spec.ts](../web/tests/browser/site-look/fonts.spec.ts), [controls.spec.ts](../web/tests/browser/site-look/controls.spec.ts), [web-tests.md](../.claude/rules/web-tests.md)
    - *Settled*: the decision row "Browser layout and font checks go through `expect.poll`…".
    - *Done when*: both specs pass `--repeat-each=5 --workers=8`.
  - [ ] **4e.** Browser tests run in `Pacific/Chatham` and `en-US` unless the shell sets `TZ`, and the dev server runs in UTC like production.
    - *Behaviours*:
      - Playwright's `timezoneId` reads `process.env.TZ`, falling back to `Pacific/Chatham`.
      - `locale` is `en-US`.
      - `webServer.env.TZ` is `UTC`.
      - The commit starts by running the suite with the dev server stopped, then fixes what fails. It re-plans when more than about a dozen specs need a fix.
      - `web-tests.md`'s zone rule now covers browser tests.
    - *New shared pieces*: none.
    - *Files*: [playwright.config.ts](../web/playwright.config.ts), [web-tests.md](../.claude/rules/web-tests.md), plus any spec the run exposes
    - *Settled*: the `Pacific/Chatham` and server-in-UTC decision rows.
    - *Done when*:
      - `yarn --cwd web playwright test --repeat-each=5 --workers=8` passes.
      - The milestone's Retro is added.
- [ ] **5. Lint rejects the patterns behind the flakes.** Component and browser tests fail lint when they forget to wait for an async step, sleep, wait for the network to go quiet, read the real clock (browser tests), or read a layout value once. Planned out of order, before step 4 finishes; one commit per plugin:
  - [ ] **5c (web).** Component and hook tests fail lint when they forget to await an async check or do work inside `waitFor`. **Next**
    - *Behaviours*:
      - The commit adds [eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library) 7.16.2 for `src/**/*.test.{ts,tsx}`, with only its flake rules:
        - `await-async-queries`
        - `await-async-utils`
        - `await-async-events`
        - `no-wait-for-side-effects`
        - `prefer-find-by`
        - `no-unnecessary-act`
      - It leaves out `no-wait-for-multiple-assertions`, because `web-tests.md` puts a positive signal and an absence in one `waitFor`.
      - It leaves out `no-node-access` and `no-container`, because they guard style, not flakes and today's tests use container queries in several files.
      - The commit starts by running lint and fixes what it flags. It re-plans when a dozen or more files need a fix.
      - Break it once: dropping the `await` before a `findBy` fails lint.
    - *New shared pieces*: none.
    - *Files*: [web/package.json](../web/package.json), `web/yarn.lock` (generated), [web/eslint.config.mjs](../web/eslint.config.mjs), [web-tests.md](../.claude/rules/web-tests.md), plus any test the run flags
    - *Settled*: the decision row "Test lint turns on each plugin's flake rules by name…".
    - *Done when*: `yarn --cwd web lint` prints nothing, and `yarn --cwd web test:unit` passes.
  - [ ] **5d (web).** Browser tests fail lint when they sleep, wait for `networkidle`, forget an `await`, read the real clock, or read a box size outside `expect.poll`.
    - *Behaviours*:
      - The commit adds [eslint-plugin-playwright](https://github.com/mskelton/eslint-plugin-playwright) 2.12.1 for `tests/**` (2.12.2 is 3 days old), with only its flake rules:
        - `no-wait-for-timeout`
        - `no-networkidle`
        - `missing-playwright-await`
        - `prefer-web-first-assertions`
      - A `no-restricted-syntax` block for `tests/**` rejects three things:
        - `boundingBox()` outside an `expect.poll` callback;
        - `Date.now()`, `new Date()` with no arguments, and `Temporal.Now.*()`;
        - a sleep (`setTimeout` inside `new Promise`, or an import from `timers/promises`).
      - The "no Google fonts" test keeps `networkidle`, with a disable comment saying it counts requests.
      - The commit starts by running lint. It re-plans when a dozen or more specs need a fix.
      - Break it once, with scratch specs:
        - one with `waitForTimeout(100)` fails lint;
        - one with a bare `boundingBox()` read fails lint.
    - *New shared pieces*: none.
    - *Files*: [web/package.json](../web/package.json), `web/yarn.lock` (generated), [web/eslint.config.mjs](../web/eslint.config.mjs), [web-tests.md](../.claude/rules/web-tests.md), plus any spec the run flags
    - *Needs*: all of step 4.
    - *Settled*: the decision rows on browser clocks and sleeps, and on flake rules by name.
    - *Done when*:
      - `yarn --cwd web lint` prints nothing.
      - The milestone's Retro is added.
- [ ] **6. The commit hook skips tests a change can't affect, and checks both packages together.** A CSS-only commit no longer runs a whole suite, and the checks before push stay the same.
- [ ] **7. One command stresses the suites on demand.** It runs shuffled, time-zone and repeated runs, so a new flake shows up before it reaches a commit.

## Terms

- **Flaky test:** a test that passes and fails on the same code.
- **Hollow assertion:** a check that passes whatever the code does, so no bug can fail it. Example: `expect({ sentAt: stored }).toMatchObject({ sentAt: other })` passes for any two Temporal times, even `2020-01-01` against `2030-01-01`.
- **Temporal value:** a time object from the Temporal library that both packages use (`Instant`, `PlainDate`).
- **Equality tester:** a function Vitest asks whether two values are equal, registered with `expect.addEqualityTesters`. Without one for Temporal, `toMatchObject` calls any two times equal.
- **Frozen clock:** a test that fixes "now" to one time, with `vi.useFakeTimers` or a spy on `Temporal.Now`, so its result never depends on the day it runs.
- **Built-in Temporal:** the `Temporal` that official Node 26 builds and modern browsers provide. `temporal-polyfill` hands it back when present, so its `Temporal.Now` reads the machine clock and ignores a faked `Date`.
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
| Playwright failures over 3 repeats, 2026-11-05 (load average about 20) | 16 of 282: 8 in the save-bar block (5 of them typed before React attached), 8 saves on the create and edit pages that missed "Saved" or the edit URL | `yarn --cwd web playwright test --repeat-each=3 --workers=8` |
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
| The web setup file makes every `Temporal.Now` method read the faked `Date` before each test | On a Node build with the built-in Temporal, the polyfill hands back the built-in, which reads the machine clock. A test reading `Temporal.Now` then sees today's time on CI and the frozen time locally | Deleting the built-in before the polyfill loads (tests run a different Temporal than the app, and it breaks once the polyfill goes); pinning CI's Node (every official Node 26 build includes Temporal); Vitest's `toFake: ["Temporal"]` alone (it swaps only the global, and our code holds the polyfill's import); a clock function in app code (app code already reads one clock, `Date.now()`) |
| The API Vitest configs read `process.env.TZ` and fall back to `Pacific/Chatham` | The stress command must override the zone from the shell, and `test.env` would otherwise overwrite it | A fixed `TZ` in `test.env` (ignores the shell, so the Kiritimati runs would silently use Chatham) |
| Heavy web form tests enter long text in one step, and the 5-second timeout stays | Typing key by key is what makes these tests slow under load, so cutting it fixes the cause. The 5-second limit keeps flagging a test that hangs or slows down | A 15-second global timeout (hides slow tests and delays the signal from a hung one); a per-test timeout list (grows as tests are added) |
| Browser layout and font checks go through `expect.poll` and `document.fonts.ready` | A single read right after a scroll or a focus lost to late layout | `waitForTimeout` (a guess); `networkidle` (waits for neither layout nor fonts) |
| Admin form tests wait for the description editor's Bold button before typing or clicking | React resets a value typed before it attaches, as the "error list" runs showed, and the editor only enables Bold once React has attached | `networkidle` (small, but it waits for requests, not React, and those runs used it); a "ready" marker in the app (exact, but app code that exists only for tests) |
| A slow mock answer waits on a promise the test releases | The test sees the loading or sending state however busy the machine is | A longer delay (one line, but still a guess, and it slows every run) |
| The dev server under Playwright runs in UTC, and only the browser takes `Pacific/Chatham` | Production renders on a UTC server for visitors in other zones, so a page that formats a time in the server's zone fails the test | The same zone for both (one more line, but it hides that bug); the machine's zone (differs between CI and laptops) |
| Lint bans real-clock reads and sleeps in browser tests only, and a line that needs one carries `eslint-disable-next-line` with its reason | Browser tests run against a real clock, so a read there races the page. Web unit tests already read a frozen clock, and API tests use "now" only as a starting point. A comment sits on the line it excuses, where a list of exempt files goes stale | Per-file exemption lists (go stale); an outright ban in every test (36 identical disable comments in API integration and end-to-end tests, plus a fix commit for 8 unit reads); detecting a frozen clock (lint can't) |
| Test lint turns on each plugin's flake rules by name, not its recommended set | They catch what makes tests flaky; the recommended sets add style rules that would flag 31 node-access lines and unrecognised `expect…` helpers first | The recommended sets (a style-fix commit each, and warnings that break a clean lint); no plugins (a missing `await` needs scope analysis, which `no-restricted-syntax` can't do) |
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
- **Done when:** this command passes with no failures:
  `yarn --cwd web playwright test --repeat-each=5 --workers=8`
- **Design notes *(temporary)*:**
  - The edit page renders the same description editor, so its Bold button proves hydration there too.
  - Under load, `fillValidForm` passes the 30-second test limit and some saves miss "Saved" within 5 seconds. 4a's hand-off re-measures them, and the plan gains a commit if any remain.
  - Each gated handler comes from a factory called in the test. A handler built once at module level would stay released on the next `--repeat-each` run, and the loading test would never see its state.
  - The dev server runs in UTC and the browser in `Pacific/Chatham`, so a page that formats a time in the server's zone shows up as a failure.
  - A dev server already on port 3000 keeps its own settings (`reuseExistingServer`), so 4e's run stops it first.
- **Flow *(temporary)*:**

```
Test opens an admin form page
├── waits for Bold to be enabled ............................. 4a
│   ├── types, clicks, saves ................................. existing
│   ├── checks layout inside expect.poll ..................... 4b
│   └── checks styles with toHaveCSS ......................... 4d
└── page with no form (404, load error): plain goto .......... existing
Test needs an in-between state (loading, sending)
└── mock gates its answer → test sees the state → releases ... 4c
Every page renders in a pinned zone and locale ............... 4e
```

## Step 5. Lint rejects the patterns behind the flakes

- **Why here:** it comes after milestones 3 and 4, so each rule starts with no violations (*Fix before enforce*).
- **Needs:** 3, 4.
- **Builds on:**
  - The Vitest blocks in [api/eslint.config.mjs](../api/eslint.config.mjs) and [web/eslint.config.mjs](../web/eslint.config.mjs).
  - [.lintstagedrc.json](../.lintstagedrc.json).
  - Twin code: the two ESLint configs repeat the same Vitest rules.
- **Size:** 2 commits, one per plugin (5c, 5d). The overview's third commit, built-in clock and sleep rules for API and web unit tests, was cut by the owner on 2026-11-05.
- **Done when:**
  - `yarn --cwd web lint` prints nothing.
  - A scratch component test with an un-awaited `findBy`, and a scratch browser test using `waitForTimeout` or a bare `boundingBox()` read, fail lint.
- **Scope:** the rules cover test files only. Production code, `web/src/mocks/` (which `dev:mock` runs) and generated code stay outside them.
- **Design notes *(temporary)*:**
  - The box-read selector uses `:not(<expect.poll call> *)`. esquery 1.7.0 passes ancestry into `:not` (checked in `node_modules/esquery/dist/esquery.esm.js`), so a descendant selector works there. A box read in a helper called from `expect.poll` would still fail, so 5d either inlines that read or comments it.
  - Both plugins pass the library check:
    - MIT licence;
    - a release within a year;
    - 7.8 M and 10.6 M downloads a week;
    - ESLint 9 flat config;
    - 1–2 dependencies.
  - Each plugin covers what `no-restricted-syntax` can't: catching a missing `await` takes scope analysis.
- **Flow *(temporary)*:**

```
Developer stages a web test file → lint-staged runs eslint --fix
├── component/hook test skips an await, works in waitFor ........ 5c
└── browser test sleeps, networkidle, missing await,
    real clock, or a box read outside expect.poll ............... 5d (after step 4)
Each branch: the commit fails with the rule's message, unless the line carries eslint-disable-next-line with its reason.
```

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

## Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-05 | Milestone 5 planned before 4b–4e, and narrowed to the two plugins; the built-in clock and sleep rules for API and web unit tests are cut | The owner asked for it out of order and slimmed it down. 5c has nothing to wait for; 5d needs all of step 4 |

## Out of scope

- Changes to `/next-commit` and CLAUDE.md, including listing this doc under *Design docs*.
- A "hydrated" marker in the app, until a browser test has no control it can wait for.
- Making Postgres-stamped times and `Temporal.Now` agree outside the two-clocks cases in milestone 3.
- Visual-regression screenshots.
