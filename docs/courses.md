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

- **Same request shape as create, and the same response as `POST` and admin `GET`.** Name, description, `contentUrl` and schedule overwrite the stored values.
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

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| PUT replaces the future price schedule, with no ids | Simple for the form to send; prices in effect stay fixed for payments | Matching entries by id, which needs `UNKNOWN_ID`, `IMMUTABLE` and `MISSING_ENTRY` errors; editing prices already in effect, which rewrites history that payments point to |
| An exact price match is a no-op | Retries and re-sent forms are safe | Treating any collision as an error |
| Past-time checks only on changed values | Otherwise a course that has started could never be edited again | The same checks as create |
| Status row only on change | Keeps a meaningful log | Appending on every save |
| Validation in the pipe plus the service | The body is typed early; checks against the stored course stay in the service | An `unknown` body parsed in the service, which would give one round of errors |
| Concurrent updates to the same course: leave as is | Rare; the race rolls back and returns a 500 | A server version check returning 409; a client `If-Match` header |
| Never detect DB errors by driver error code (for example a unique-violation SQLSTATE) | That relies on library internals. Use documented ORM features (`onConflict: "skip"`, conditional updates) instead, or let it become a 500 | Catching `unique_violation` |
| Generic field error codes | `field` already says which field | Per-field prefixed codes such as `NAME_TOO_SHORT` |
| Free courses (price 0) allowed | They skip Stripe entirely | Rejecting 0 |
| `Idempotency-Key` removed from create; bearer auth kept in the spec (now a session token, not a JWT) | Auth is next; idempotency wasn't needed | Keeping both, or removing both |
| Public get still returns ended courses | Existing links keep working; checkout gives a clear 409 | Hiding them everywhere |
| Public `enrollmentCount` counts only active enrollments; the admin list still returns every enrollment of every course | The public number means people who have access. Admins need the full history, and there are few enrollments per course | Counting all rows publicly; filtering the admin list |
| A course's latest status stays computed from the `CourseStatus` log, through one shared helper, with `@@unique([courseId, changedAt])` | No second copy of the status to keep in step. The query is cheap at this shop's size. The constraint closes the one real gap: two statuses with the same `changedAt` (Postgres's `now()` is fixed for a whole transaction) would both count as latest, so a deleted course could show as published. A second status write for a course in the same transaction now fails instead of tying. Same pattern as `CoursePrice`'s `@@unique([courseId, effectiveAt])` | A `Course.currentStatus` column written beside each log row (duplicated state that can drift, plus a migration and backfill); a tie-breaking sequence column |
| `AdminCoursesService.updateCourse` does its read, validation and write in one transaction | The service owns the transaction, and validating against a read taken before the write left a gap for a concurrent edit. Cost: the transaction stays open during a little in-memory validation, with no network calls. No row lock is taken, so two simultaneous edits can still interleave | Keeping the read outside and wrapping only the write (the gap stays) |
