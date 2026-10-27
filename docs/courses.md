# Courses

Read this before working on creating, editing or browsing courses. It records progress, behaviour that spans several files, and why each choice was made. Shapes live elsewhere and aren't repeated here: the schema is in [contract.prisma](../api/src/prisma/contract.prisma), endpoints are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml), and admin UI behaviour is in [web/docs/admin.md](../web/docs/admin.md).

Keep this file current **in the same commit as the work**.

## Status

- [x] API, public: list and get courses.
- [x] API, admin: list, get, create (`POST`) and update (`PUT`).
- [x] Web: home page with the course list, and the course page.
- [x] Admin authentication: every admin route requires a login (see [auth.md](auth.md)).
- [ ] Web admin pages (spec in [web/docs/admin.md](../web/docs/admin.md)).
- [ ] Estimated payout under the admin price field (payments step 7).
- [ ] **Course images** (design in *Course images* below):
  - [x] **1. API: check and convert an uploaded image** ([course-image.ts](../api/src/courses/course-image.ts)). Nothing calls it yet.
  - [x] **2a. API: store a course's image** ([course-images.repository.ts](../api/src/courses/courses.repository/course-images.repository.ts)). Admin course responses carry `image: { updatedAt, version } | null`, always `null` until 2b.
  - [x] **2b. API: upload and read back the image (admin).** `PUT /v1/admin/courses/{courseId}/image` (multipart, one `image` file, 204) and admin `GET /v1/admin/courses/{courseId}/image`. Code: [admin-course-images.controller.ts](../api/src/courses/admin-course-images.controller.ts), [course-image-upload.interceptor.ts](../api/src/courses/course-image-upload.interceptor.ts).
  - [x] **3. API: don't allow publishing a course without an image.** Create accepts only `drafted` and `archived`; an update to `published` needs an image ([course-update-rules.ts](../api/src/courses/validation/course-update-rules.ts)).
  - [x] **4. API: serve the image publicly.** Public course responses (list and get) carry `image: { version }`; `GET /v1/courses/{courseId}/image/{version}` ([courses.controller.ts](../api/src/courses/courses.controller.ts)), visible courses only.
  - [ ] **5. Web: show the image on the home page and the course page.** **Next** Same-origin route that forwards to `GET /v1/courses/{courseId}/image/{version}` (200 `image/webp`, `Cache-Control: public, max-age=31536000, immutable`, 404 otherwise), plus `next/image`; details in *Course images → Showing it*. The mock course literals already carry `image: { version }`.
  - [ ] **Later, with the admin web pages:** the upload form and preview from *Course images → What the admin sees*, and "missing image" in the admin course list.
- [ ] Maybe later: a contract test that checks e2e responses against the OpenAPI schemas with Ajv. It was deferred ("not now").

## Who sees what

| Viewer | Which courses | Rule lives in |
|---|---|---|
| Public list | Visible and not yet ended, ordered by start time | [courses.repository.ts](../api/src/courses/courses.repository/courses.repository.ts) |
| Public get by id | Visible, **including ended courses**, so old links keep working. Checkout refuses an ended course with 409 | same |
| Admin list | Every course whose latest status isn't `deleted` | [admin-courses.repository.ts](../api/src/courses/courses.repository/admin-courses.repository.ts) |
| Admin get by id | Any course | same |

"Visible" means the latest status is `published` and some price has taken effect. The current price is the latest one in effect. This rule is shared with checkout through [course-visibility.ts](../api/src/courses/course-visibility.ts), which also exports `latestStatusIs` and `latestStatusIsNot` for any query on a course's latest status (the admin list uses the latter). Reuse them rather than deriving it again.

`contentUrl` (the Drive or Zoom link) is private. Only admin responses and the access email ever include it.

## Editing a course (`PUT`)

- **Same request shape as create, and the same response as `POST` and admin `GET`.** Name, summary, description, `contentUrl` and schedule overwrite the stored values.
- **Status is an append-only log.** A row is added only when the status actually changes, so the log records real transitions and `changedAt` stays meaningful. `deleted` can only be set by an update; create doesn't accept it.
- **Prices are an append-only history, and price entries have no ids.** The request's `prices` are the course's complete **future** schedule:
  - a stored future price that exactly matches a request entry (same amount, currency and `effectiveAt`) is kept, so retrying a PUT, or re-sending what the form loaded, changes nothing;
  - other stored future prices are deleted, and new entries are inserted;
  - prices already in effect are never changed or deleted, because payments point at `CoursePrice` rows;
  - `prices` may be empty only while some price is already in effect.
- **Past-time checks apply only to values that changed.** A start time, end time or price `effectiveAt` must be in the future only if it differs from the stored value. A course that has started can still have its description edited.
- Comparisons round request times to microseconds, Postgres's precision, so a value sent back unchanged isn't treated as a change.

## Validation

- **Two stages:**
  - `ZodValidationPipe` checks the shape and the rules that don't need the database, and types the body;
  - the service then checks the rules that need the stored course ([course-update-rules.ts](../api/src/courses/validation/course-update-rules.ts)).

  Errors can therefore arrive in two rounds, and the spec says so.
- **Field errors use the spec's generic codes**: `field` is a JSON Pointer, plus a `FieldErrorCode` (`TOO_SHORT`, `IN_PAST`, …) and a `detail`. A client looks up code plus field.
- **Prices:** an integer number of minor units, either `0` (free, skips Stripe) or at least `50`, Stripe's 50¢ minimum. The currency must be in `ALLOWED_CURRENCIES`.
- **Times:** the API accepts and returns only UTC instants ending in `Z`. Time zones must be IANA names such as `America/New_York`; numeric offsets like `-07:00` are rejected for clarity.

## Course images

Every course has exactly one image, shown on every public page. It is uploaded separately from the course, stored in Postgres, always 16:9, and a course can't be published without one.

- **Checking and converting (step 1).** [course-image.ts](../api/src/courses/course-image.ts) returns `converted` (a 1600×900 WebP) or `rejected` (one error on `/image`). The file name and the client's `Content-Type` are never trusted; sharp decides the format from the bytes.
  - Loaders for SVG, HEIF, PDF, GIF and TIFF are blocked with `sharp.block()`. A misspelt operation name is silently ignored, so each blocked format has a refusal test.
  - Order: missing file, over 5 MB (before parsing), unreadable or not JPEG/PNG/WebP, over the pixel limit (from the header, so the error is ours and not sharp's), under 800×450. `limitInputPixels` stays on the conversion as a backstop.
  - The minimum is judged on `metadata().autoOrient` (the size after the orientation flag), so a rotated 800×450 photo is judged as it will look.
  - Convert: `.autoOrient()` before the crop (a phone stores the sensor's orientation plus a hidden tag, and re-encoding drops the tag), `cover` (fill the frame, cut the overflow evenly, so every card is the same shape), then WebP (smaller than JPEG or PNG). Re-encoding drops all metadata, such as GPS, and anything hidden in the file.
  - Animated images are accepted and keep only their first frame (sharp's default; refusing them would be extra code).
  - Errors: `REQUIRED`, `INVALID_FORMAT`, `ABOVE_MAXIMUM` (over 5 MB or the pixel limit), `BELOW_MINIMUM`. Tests build images with `sharp({ create: … })`, so no binary files are committed.
- **Storage (step 2a).** `CourseImage`: `courseId` (primary key and foreign key to `Course`, `onDelete: Restrict`), `bytes`, `updatedAt`.
  - **Never removed.** No repository method deletes a `CourseImage`. The test wipe list in [integration.setup.ts](../api/src/test/integration.setup.ts) deletes it before `Course`.
  - **Never load the bytes by accident.** Course queries include only `image.updatedAt`. Only the image endpoints read `bytes`.
  - **`updatedAt`** is set explicitly in both branches of the upsert (insert and conflict on `courseId`), from `Temporal.Now`. It is a version, never compared with a database-filled column, so `DatabaseClock` isn't needed. The version is its epoch milliseconds.
  - PSL `Bytes` maps to `bytea` and reads back as a `Uint8Array`. `saveImage` uses `.select("updatedAt").upsert({ create, update, conflictOn: { courseId } })`, so the upsert returns no `bytes`. `findImage` is the only read of `bytes`.
- **Migration (step 2a).** Plain: `yarn contract:emit`, then `yarn prisma migration plan` creates the table (apply the CLAUDE.md "Migration trap" `.js` suffix fix). No backfill, because the database is dev-only. A database that already holds published courses would break "published means has an image"; recreate it.
- **Upload endpoint (step 2b).** `PUT /v1/admin/courses/{courseId}/image`, admin-only. Order of work: check the id (`INVALID_COURSE_ID`), confirm the course exists (404 `COURSE_NOT_FOUND`; otherwise the foreign key would fail with a driver error, which we never catch), convert the image (CPU work, before any database write), then upsert. Returns 204.
  - **Reading the file.** Nest's `FileInterceptor` already turns multer errors into plain 413/400 responses, so an interceptor wrapped around it never sees the multer code. Instead add `multer` and `@types/multer` as direct dependencies and write a small interceptor that calls `multer({ storage: memoryStorage(), limits }).single("image")` itself and maps `MulterError.code`: `LIMIT_FILE_SIZE` to `/image` `ABOVE_MAXIMUM`, the others to `/image` `UNKNOWN_FIELD`. Limits: `files: 1`, `fields: 0`, `parts: 1`, `fileSize: 5 MB`.
  - Guards run before interceptors, so a request without an admin login gets 401 before the file is read. Test this.
  - A race between two `PUT`s on the same course leaves the last one in place.
- **Admin read (step 2b).** `GET /v1/admin/courses/{courseId}/image` returns any course's image with `Cache-Control: private, no-cache`, so the admin always sees what is stored. 404 if the course or its image doesn't exist.
- **Responses.** Admin responses (list, get, create, update) get `image: { updatedAt, version } | null` (`null`: nothing uploaded yet). Public responses get `image: { version }` in step 4, never null. One mapper helper builds `version` from `updatedAt` for both, so the value has one name. The public mapper treats a missing image as a broken rule and throws (a 500), because the publishing rule guarantees one. The spec says `version` is epoch milliseconds as a decimal string.
- **Publishing needs an image (step 3).** The only place "required" is enforced; the visibility rule in [course-visibility.ts](../api/src/courses/course-visibility.ts) is unchanged.
  - Create refuses `published` (`/status` `INVALID_VALUE`). Update refuses a change *to* `published` with no stored image, with the same code and "Upload an image before publishing." A course that is already published isn't re-checked. The check sits with the other stored-course rules and runs inside the update transaction; images are only ever added, so it can't race.
  - `createCourse` in [course-fixtures.ts](../api/src/test/course-fixtures.ts) takes an optional `status` (default `published`) and adds a tiny WebP image when published, so fixtures keep the same invariant. Tests that need an image-less course pass `status: "drafted"`.
- **Serving publicly (step 4).** `GET /v1/courses/{courseId}/image/{version}` is `@Public()` and uses the shared visibility rule (ended courses included, like public get). It returns 404 `COURSE_NOT_FOUND` if the course isn't visible **or the version isn't the current one**; this keeps the cache from being filled with made-up URLs. The cost: a page loaded before a replacement shows a broken image until it is reloaded. It sends `Content-Type: image/webp`, `Cache-Control: public, max-age=31536000, immutable` and the app-wide `nosniff`. The spec declares the response `image/webp`, `type: string, format: binary`, 1600×900. No ETag: browsers only talk to Next's image endpoint.
- **Showing it (step 5).** The browser never talks to the API.
  - A Next route handler, `web/src/app/courses/[courseId]/image/[version]/route.ts`, checks the id is a UUID and the version is digits, fetches the bytes through a wrapper in `web/src/lib/api/` (`parseAs: "arrayBuffer"`, returns a `Result`) and sends them on with the same headers.
  - `CourseCard` and `CourseDetailsView` render `next/image` with `src="/courses/{id}/image/{image.version}"`, `width={1600} height={900}`, `alt=""` and a `sizes` suited to each layout. On the course page add `priority` (it is the largest thing on screen) and cap the page at about 800 CSS px wide (e.g. `max-w-3xl`), so the 1600 px image stays sharp on 2× screens. Cards are about 350 CSS px wide, so they are covered.
  - `next.config.ts` sets `images.localPatterns: [{ pathname: "/courses/*/image/*", search: "" }]` and `qualities: [75]` (not set today). Read `web/node_modules/next/dist/docs/` first.
  - The MSW handler returns a tiny real WebP embedded as base64 (Next's optimizer decodes it), with `success` and `notFound` scenarios.
  - `openapi-typescript` types `format: binary` as `string`, so a later web upload needs a `bodySerializer` with `FormData`.
  - Out of scope: Stripe Checkout product images and emails.
- **What the admin sees (admin web pages step).**
  - The form creates the course as a draft (`POST`), uploads the image (`PUT …/image`), then publishes it (`PUT`) if the admin chose to. If the upload fails, the course stays a draft and the admin list shows "missing image".
  - The preview matches the server's crop: the chosen file from `URL.createObjectURL`, in a 16:9 box with `object-fit: cover; object-position: 50% 50%`. Browsers apply the orientation flag by default, as `.rotate()` does.
  - The form checks type, size and minimum size before uploading; the server's checks still apply.
  - After saving, the page shows the stored image from the admin endpoint.
  - A Playwright test compares the preview with the saved image for a portrait and a wide input.
- **CDN (launch, no code).** The image responses are `public` and immutable, so a CDN in front of the web app caches them with no code changes. A replaced image has a new URL. Old versions stay in Next's image cache until it evicts them; accepted.
- **Tests per step:**
  1. Unit: JPEG, PNG and WebP come out as a 1600×900 WebP with no metadata; a portrait is cropped, not stretched; a rotated photo is judged after rotation; SVG, GIF, text, too many pixels, too small and over 5 MB are refused with the right codes.
  2. **2a:** repository integration tests (upsert insert and replace, `updatedAt` moves, bytes not selected by course queries, wipe list). **2b:** e2e upload and download; over 5 MB; a wrong field name; unknown course 404; 401 without a login.
  3. As listed under *Publishing needs an image*.
  4. E2e: headers; a draft course gets 404; an ended course gets 200; a stale version gets 404; no admin login needed.
  5. View unit tests check the `img` has an empty alt; a route handler test with MSW.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| PUT replaces the future price schedule, with no ids | Simple for the form to send; prices in effect stay fixed for payments | Matching entries by id, which needs `UNKNOWN_ID`, `IMMUTABLE` and `MISSING_ENTRY` errors; editing prices already in effect, which rewrites history that payments point to |
| An exact price match is a no-op | Retries and re-sent forms are safe | Treating any collision as an error |
| Past-time checks only on changed values | Otherwise a course that has started could never be edited again | The same checks as create |
| Concurrent updates to the same course: leave as is | Rare; the race rolls back and returns a 500 | A server version check returning 409; a client `If-Match` header |
| Public get still returns ended courses | Existing links keep working; checkout gives a clear 409 | Hiding them everywhere |
| Public `enrollmentCount` counts only active enrollments; the admin list still returns every enrollment of every course | The public number means people who have access. Admins need the full history, and there are few enrollments per course | Counting all rows publicly; filtering the admin list |
| A course's latest status stays computed from the `CourseStatus` log, through one shared helper, with `@@unique([courseId, changedAt])` | No second copy of the status to keep in step. The query is cheap at this shop's size. The constraint closes the one real gap: two statuses with the same `changedAt` (Postgres's `now()` is fixed for a whole transaction) would both count as latest, so a deleted course could show as published. A second status write for a course in the same transaction now fails instead of tying. Same pattern as `CoursePrice`'s `@@unique([courseId, effectiveAt])` | A `Course.currentStatus` column written beside each log row (duplicated state that can drift, plus a migration and backfill); a tie-breaking sequence column |
| `AdminCoursesService.updateCourse` does its read, validation and write in one transaction | The service owns the transaction, and validating against a read taken before the write left a gap for a concurrent edit. Cost: the transaction stays open during a little in-memory validation, with no network calls. No row lock is taken, so two simultaneous edits can still interleave | Keeping the read outside and wrapping only the write (the gap stays) |
| Course images are uploaded and stored in Postgres (`bytea`) | No new infrastructure or credentials. ~100 KB per course is small at this shop's size, and backups cover them | Object storage (S3/R2: a cloud dependency, credentials and a local stand-in for tests); a pasted URL (depends on another host; the link can break or change content) |
| Image storage has its own `CourseImagesRepository`, apart from `AdminCoursesRepository` | The only code that reads `bytes` stays in one small file. Both the admin endpoints (2b) and the public one (4) use it without the course-details query | Methods on `AdminCoursesRepository` (public serving would depend on the admin repository) |
| The image is a sub-resource, `PUT /v1/admin/courses/{courseId}/image`, keyed by `courseId` | One image per course by primary key; an image can't exist without its course, so no cleanup job. Course create and update stay JSON | The file inside the course `POST`/`PUT` (multipart turns every course request into a form); an upload endpoint returning an id (abandoned uploads need a cleanup job) |
| A course can't be published without an image; create accepts only `drafted` and `archived` | A published course always has an image (images are never removed), so the visibility rule, browsing and checkout need no change. The admin form takes three requests: create a draft, upload, publish | A required foreign key on `Course` (forces the file into the create request); hiding image-less courses in the visibility rule (a published course could sit invisible, which is confusing) |
| No placeholder or backfill in the migration | The database is dev-only and can be recreated at any time | A hand-written backfill with a grey placeholder image |
| Every upload is checked by its real format and re-encoded to a 1600×900 WebP by `sharp` | Strips metadata and hidden content; one format and one size | Checking only the file's first bytes ("magic bytes"), which keeps metadata and files that are valid as two formats at once |
| Fixed 16:9, cropped around the centre; the admin preview uses the same crop | Even card grid; no sizes in responses; the admin sees exactly what the public will | Keeping each image's shape (uneven cards); letting the owner choose the crop (needs a crop UI) |
| Pixel limit 25M with no conversion queue | Accepts large phone photos. Worst case about 100 MB per upload, fine for one admin | A 16M limit (refuses 48 MP photos); a one-at-a-time queue |
| The image is decorative (`alt=""`) | The course name beside it already says what it is | A required alt-text field; the course name as alt (read twice) |
| Cached for a year, with the version (`updatedAt` in epoch milliseconds) in the URL path; a non-current version is a 404 | A change makes a new URL, so long caching is safe and a replaced image shows at once. In the path, Next's allow-list can match it exactly, and made-up URLs can't fill the cache | A short cache time (lag of up to about a day); a `?v=` query string (the allow-list can't match a changing query, so it would have to stay open); an ETag (the browser only sees Next's image endpoint) |
| Block TIFF as well as SVG, HEIF, PDF and GIF; animated images keep their first frame | TIFF is a large parser we never need. Animated images need no extra code to flatten | Blocking only the four first listed; refusing animated images (extra code) |
| `multer` is a direct dependency, used by our own interceptor | Nest's `FileInterceptor` hides the multer error codes we need to map to field errors, and a transitive dependency shouldn't be relied on | `FileInterceptor` plus a wrapper (never sees the codes) |
| The web serves images through its own route | Keeps the API off the public internet, as for all other data | Pointing `<img>` at the API directly |
| No image yet gets its own 404, `COURSE_IMAGE_NOT_FOUND` | A client can tell "no such course" from "nothing uploaded yet" | Reusing `COURSE_NOT_FOUND`, which would say a course that exists doesn't |
| A malformed multipart body is `/image` `INVALID_FORMAT` | Multer's non-`MulterError` messages aren't a stable API, so only its error `code` is read | Matching message text; a plain 400 the spec doesn't list; leaving a 500 |
| `multer` 2.5.0 is a direct dependency, called by our own interceptor | The patched release (GHSA-q7qp-rjg7-q26m), and we use no `fileFilter`. Nest's pinned 2.4.0 copy only runs for `FileInterceptor`, which we don't use | Staying on Nest's copy; `FileInterceptor`, which hides multer's error codes |
| The generic error wording was widened in 2b, not 3 | The spec stays true as soon as the upload exists | Waiting for step 3 |
| Test fixtures add an image to published courses (`createCourse` with `status`) | Dozens of specs use a published course; the fixture keeps the "published means has an image" rule the API enforces | Every test adding its own image; an opt-out flag that allows image-less published courses |
| The public image lookup is one query in `CourseImagesRepository.findVisibleImage`, built on the shared visibility rule | `bytes` is still read in one file only, and the image request loads no prices or enrollment count | Reading it through `CoursesRepository` (a second reader of `bytes`); `findById` followed by `findImage` (two queries, most of the first unused) |
| A version that isn't a number is a 404 `COURSE_NOT_FOUND`, like any non-current version | One rule: the URL is not the current image. Only our own web route builds these URLs | A 400 with a new error code (more code and spec for no client benefit) |
