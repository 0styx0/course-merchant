# Web app

Read this before changing how `web/` is structured, how it calls the API, or how its pages handle errors, caching and admin login. It records what the code can't tell you: progress, design intent, and why each choice was made. Endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml); behaviour specs for pages are in [web/docs/](../web/docs/).

Keep this file current **in the same commit as the work**. Tick off status, add a decision row when something is decided, and when a step ships, cut its notes down to decision rows.

## Status

Each step is one commit. Every step's tests are part of the step. Steps 1–5 come before courses step 5 (images), because that step's paths depend on step 5 here.

- [x] **1. Refresh the home page every minute instead of freezing it at build time.**
- [x] **2. One Result mapper and error model.**
- [x] **3. A real 404 for an unknown course.**
- [x] **4. Shared test data and mock helpers.**
- [ ] **5. Feature folders and plain-data components.** **Next** Moves only; no behaviour change.
  - `app/` holds routes only. Public routes go in a `(shop)` group whose layout owns the one `<main>` and an `error.tsx`. Admin routes: `app/admin/login`, plus `app/admin/(signed-in)/` whose layout shows nav and logout only (it is not the security check).
  - Code lives in `src/features/`: `courses/`, `checkout/`, `admin-auth/`, `admin-courses/`. Each has `<feature>.api.ts` (server-only wrappers named after operationIds), `<feature>.actions.ts` (`"use server"`) when it has forms, and its components.
  - `components/ui/` holds shadcn primitives only; `components/` holds app-wide pieces like `ProblemAlert`.
  - Components take plain data (`CourseCard({ course })`). An async `…Section` component fetches inside `<Suspense>` and chooses between the data and `<ProblemAlert>`.
  - Update [ARCHITECTURE.md](../ARCHITECTURE.md) (code map, "Web: container and view"), the README layout, [CLAUDE.md](../CLAUDE.md) *Web architecture* and the step 5 paths in [courses.md](courses.md).
- [ ] **6. Course cards link to their page,** show `summary` instead of `description`, show formatted local times instead of raw ISO strings, and use `key={course.id}`.
- [ ] **7. Security headers** in `next.config.ts`: `poweredByHeader: false`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors 'none'` (stops other sites framing the admin pages).
- [ ] **8. Real site metadata and one font** in the root layout (today: "Create Next App", and Geist Sans loaded but unused).

## Principles

- **The browser never calls the API.** Server Components read, Server Actions change data, and route handlers serve images.
- **Each page states its freshness on the page itself:** per request (because it reads params or cookies) or `revalidate`.
- **Expected errors are return values, unexpected ones throw.** The API answering with problem+json is expected; the API being unreachable is not.
- **Components take plain data.** Fetching and choosing what to show happen in pages and async sections.
- **Pages put features together.** Public features don't import each other. Admin features may import public ones and `admin-auth`, never the reverse.
- **Wrappers are named after operationIds,** and so are mock handler files, so one name follows an endpoint from the contract to the mock.
- **Every admin read and action calls `requireAdminSession()`.** The API's guard is the real check; the web check only sends a logged-out admin to the login page.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Only the Next server calls the API | One typed client and one place that adds the login. The admin token stays in an `httpOnly` cookie and is added on the server, so an injected script can't read it. No CORS or CSRF code in the API. One MSW setup covers every call. Accepted: an extra hop, and the API sees only Next's IP (per-IP limits sit at the edge; the API's own limits are per email). Would change with a second client such as a mobile app (then one reverse proxy and cookies set by the API), or uploads far over 5 MB (then pre-signed uploads straight to storage) | The browser calling public endpoints directly (two clients, CORS, browser-side mocks); the browser calling everything with a cookie set by the API (CSRF, CORS and cookies move into the API, and [auth.md](auth.md) is rewritten); a Next rewrite of `/api/*` (it can't turn the cookie into `Authorization`, so admin calls still need server code) |
| The home page is regenerated at most once a minute (`revalidate = 60`) | Fresh enough for a small catalogue, and most visits cost no API call. Accepted: a scheduled price or a course's end time can show up to a minute late (Stripe still charges the current price), and the build needs the API. Other pages are already per request because they read params or cookies | `await connection()` or `force-dynamic` (an API call on every visit); `connection()` hidden in the shared client (hides the reason from the page); today's build-time copy (frozen until deploy) |
| No Cache Components (`use cache`) | Whether a course shows, and at what price, depends on the clock; tags cleared by admin edits can't express that | `use cache` with tags |
| Feature folders under `src/features/`, `app/` for routes only | They match the API's modules and the design docs, and pieces used by several routes (`getCourse`, the course form) have one home | Colocating in `app/` with `_components` folders; today's folders by kind of file |
| Async `…Section` components plus plain-data components | A component that shows a course doesn't know about API errors, so it can be reused (e.g. the admin preview) | Views that take a `Result` (today) |
| A real 404 for an unknown course, without a loading state | The status code is right and the page gets a real title. The course fetch is fast | A soft 404 (200 plus `noindex`) keeping `loading.tsx` |
| `getCourse` is wrapped in React `cache` | The page and `generateMetadata` share one API call per render. Next's fetch dedup wouldn't catch it, since each call gets its own `AbortSignal.timeout()` | Two API calls; `cache` in the page file |
| Only the page calls `notFound()`; `generateMetadata` returns no title on failure | One place decides the status, and it runs before anything streams | Both calling `notFound()` |
| Forms use Server Actions with `useActionState` | Works without JavaScript, shows field errors from the returned state, and runs on the server where the token is. Actions read named fields only and never send a price. They return the submitted values (never a password) because React 19 empties the form after an action | Route handlers called with `fetch` from the browser (own Origin check and auth) |
| Image upload is a Server Action with a body limit of about 6 MB | One function creates the draft, uploads the image, then publishes, keeping the draft if the upload fails. The limit applies to every action, so the edge limits each path (see Launch) | A route handler streaming to the API (its own auth, Origin check and client-side orchestration) |
| The checkout success page polls with `router.refresh()` | No extra endpoint; the status is rendered on the server. It stops on any status other than `pending`, or after about a minute ("your email is on its way"), and calls `notFound()` for a missing or unknown checkout id | A polling route handler; `<meta http-equiv="refresh">` (full reloads) |
| No `proxy.ts` until a nonce-based CSP needs one | A cookie-presence check would be a second place to keep in sync, and the API already decides | Redirecting logged-out admins in `proxy.ts` |
| The admin cookie is `__Host-admin_session` in every environment | The prefix makes browsers refuse it unless it's `Secure`, site-wide and tied to one host. Chromium (Playwright) accepts it on http://localhost; Safari on localhost is a known limitation | A different name per environment |
| The image route sets `Content-Type: image/webp` itself and forwards only `Cache-Control` | A misbehaving upstream can't serve another type from the web's origin | Copying the API's headers |
| A bad `API_BASE_URL` stops the server at boot | A startup error beats every request failing, and matches [auth.md](auth.md) step 5. `register()` in `instrumentation.ts` checks it and calls `process.exit(1)`: a throw there only logs "Failed to prepare server". `api-config.ts` reads it once and remembers it | Rewording the docs to match today's behaviour; throwing from `register()` |
| The home page's course list fetch throws on any failure | During background regeneration a throw keeps the last good copy and retries on the next request; a returned error would be saved and shown for a minute | Returning a failure `Result` like the other wrappers |
| Each API call times out after 10 s, with its own `AbortSignal.timeout()` | A hung API can't hold server requests open. One shared signal would expire for every later call. A constant, since nothing needs to tune it per environment yet | An env setting; no timeout (today) |
| A root `app/error.tsx` until step 5 moves it into `(shop)` | Once the list throws, a render with no good copy (always in `next dev`) needs a page; it shows no error text, since production only sends a digest | Next's bare default error page |
| Tests and `dev:mock` point `API_BASE_URL` at one constant, `MOCK_API_BASE_URL`, which the MSW handlers listen on | The app still goes through its real config, and Playwright's test process (where the handlers run) needs no env. `dev:mock` needs no `.env.local` | Handlers reading `apiBaseUrl()` (throws in the Playwright process); wildcard handlers (`*/v1/...`, which stop checking the URL) |
| A failure is a `Result` only when the body is a problem (`title`, `detail`, `code` strings); anything else throws | Pages can trust `code`, and a 204 is a success. `toResult()` in `lib/api/` is the one place that decides; `ProblemAlert` shows `title` and `detail`; the root `error.tsx` shows thrown errors | `error \|\| !data` (let a 204 and non-problem bodies through as failures); a made-up problem for non-problem bodies; Zod for a three-field check |
| `web/` is an ES module package (`"type": "module"`) | Vite's native config loader needs it, and it matches `api/`. Config files import `.ts` with the extension (`allowImportingTsExtensions`) | Silencing the warning with `VITE_CONFIG_NATIVE_IGNORE_WARNING`; copying the mock URL into the Vitest config |
| Browser tests are named `tests/browser` and `test:browser` | They drive a browser against a mocked API. In `api/`, `integration` and `e2e` both mean a real database | `tests/integration`; `tests/e2e` |
| Sample courses are fixtures with fixed IDs in `mocks/fixtures/`, and `dev:mock` falls back to an endpoint's `success` when it lacks the chosen scenario | One copy of the data for MSW, Vitest and Playwright, and failures that repeat. Fixtures sit in `mocks/` because `dev:mock` uses them too. Formatted output is still asserted as literals, so tests don't reuse the formatter they check. Without the fallback, a scenario like `empty` left the course page with no handler | `randomUUID()` per run; a `makeCourse()` factory; throwing when any endpoint lacks the scenario |

## Launch

- Edge rate limits per path: allow request bodies up to 6 MB only for POST `/admin/courses/*`. A Server Action posts to its page's own URL, so the buy-form limit in [payments.md](payments.md) applies to POST `/courses/*` (course pages are otherwise only fetched with GET).
