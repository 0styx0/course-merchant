# Course page

Read this before working on the public course page, its buy panel, the site header and footer, or the return page from Stripe. It records what the code can't tell you: progress, intent, and why. The look to match is [course-page.html](wireframes/course-page.html); its 24 notes give the reason for each element. Related docs: [payments.md](payments.md) (step 6 moved here), [courses.md](courses.md) (the course page's half of *Course images*, item 5, moved here), [style-guide.md](style-guide.md), [web.md](web.md). Run it with `/plan-create-implementation course-page`, then `/next-commit course-page`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it is the one marked next.

- [x] **1a.** Admin and public pages show the guide's light colours, one error box (ProblemAlert) and green success marks through `--success`; the contrast spec checks every light §11 pair.
- [x] **1b.** Every page shows DM Sans (italic file loads too); admin page titles show Playfair Display on the guide's type scale.
- [x] **1c.** Buttons are 48px, with the guide's label, colours and focus ring; the hover colours are tokens, and the alert dialog title uses DM Sans.
- [x] **1d.** Fields are 48px white boxes with `rounded-md`, 1rem text and a destructive border when invalid; any focus, including the status radio, shows the ring.
- [x] **1e.** Public pages show Playfair titles on the type scale (home, course, 404, list, card) and the guide's muted text; no `gray-` or `green-` classes remain.
- [x] **2a.** The mock courses keep times that hold for years, the free course shows on the mock home page, and each mock course page answers for the course in its URL.
- [x] **2b.** The web server can enroll a visitor: it sends the course, name and email to the API and returns "check your email", the API's problem with the typed values, or a redirect to Stripe.
- [x] **2c.** A visitor on a free course opens the fields in place, sends a name and email, sees "Sending…", then "Check your email" with focus on it; a problem shows above the fields with the values kept.
- [x] **3a.** Admin and checkout share one routine that turns the API's field errors into form-field errors.
- [x] **3b.** The API words a bad name or email in plain sentences; admin login shares the email words.
- [x] **3c.** A visitor sees the API's field messages under Name and Email, with a red border, and focus lands on the first wrong field.
- [x] **3d.** A visitor keeps their typed values when the API is down or slow.
- [x] **3e.** A typo or a too-long name or email shows its message at once, with no request sent.
- [x] **4a.** A visitor on a paid course opens the fields from "Enroll for $99.00 →", sends, sees "Opening payment…", and lands on the payment page.
- [x] **4b.** A visitor who presses Back from Stripe finds the form ready to use, with their typed values; unit tests cover the restore, because Chromium under `yarn dev` never restores the page (its reason reads `masked`), and a browser test checks that Back otherwise loads a fresh closed button.
- [x] **4c.** When Stripe or our API is down, a paid visitor sees the problem above the fields, keeps their typing, and the button reads "Try again →".
- **5. Coming back from Stripe.** The return page says the email is on its way, or what happened instead.
  - [x] **5a.** The checkout code sits grouped by job: starting a checkout, the shared "check your email" box, and the form.
  - [x] **5b.** A buyer back from Stripe after the webhook sees "Thank you." and Check your email, and a bad link shows the not-found page.
  - [x] **5c.** A buyer whose checkout timed out, was refunded or is still confirming reads what happened.
  - [x] **5d.** A buyer who arrives before our server hears from Stripe watches the page switch to Check your email by itself, and after a minute reads that their payment was received.
- **6. Site header and footer.** Every public page has the header, the phone menu and the footer.
  - [x] **6a.** Every public page shows a sticky header with the wordmark and Courses, and a footer with the wordmark and Courses.
  - [x] **6b.** A visitor who mistypes a URL sees "Page not found" with the header and footer and a ghost link to the courses; the course and checkout 404s share its look, and each 404 names its tab.
  - [x] **6c.** The footer's Contact link opens an email to the shop, and the web server refuses to start without a valid address.
  - [x] **6d.** On a phone, a Menu button opens a full-height sheet with Courses; Escape, the close button or a link closes it, and focus returns to Menu.
- **7. Course page layout.** The image, title and description sit beside a sticky panel on desktop, stacked on a phone.
  - [x] **7a.** The mock handlers sit in topic folders (admin-courses, courses, checkout), so the next handler fits.
  - [x] **7b.** A visitor who opens a course's image address sees its image; nothing shows on the page until 7c.
  - [x] **7c.** The course page shows the image above the title in a 16:9 box, resized by Next for each screen.
  - [x] **7d.** On desktop, the details and the Enroll button stay 96px from the top while the description scrolls; on a phone, they sit under the summary.
  - [x] **7e.** The description reads in the wireframe's rich-text look on the public page and in the admin editor.
- **8. Buy panel looks.** The panel shows the price, the button with its price, the after-enroll note, and the free, in-progress and ended looks.
  - [x] **8a.** Prices read "$99", "$49.50" and "Free" on the course page, its Enroll button and the course card.
  - [ ] **8b.** The course page's side column becomes a flat panel with today's schedule lines, the price, a full-width Enroll button and the "After you enroll." note, and it no longer shows the enrollment count. **Next**
    - *Behaviours*:
      - The panel is an `aside` labelled "Enroll in <course name>".
        - It has a `--surface-alt` fill, `rounded-lg` corners and 24px padding.
        - It has no border and no shadow.
      - The panel reads schedule, price, button, note, in that order (wireframe note 5).
      - The paid note reads "You pay on Stripe's secure page. Then we email you a link to the course material. You don't need an account."
      - The free note reads "We email you a link to the course material. You don't need an account."
      - The note shows under the closed button and under the open form, including after an error and while sending.
      - After "Check your email" the note hides and the price stays.
      - The Enroll and send buttons fill the panel's width at every width.
      - The page shows no enrollment count.
    - *New shared pieces*: none, because the panel and the note each have one user.
    - *Files*:
      - `web/src/features/courses/buy-panel/buy-panel.tsx` (new, with a test)
      - [course-details.tsx](../web/src/features/courses/course-details.tsx) (the side column holds only its children; test updated)
      - `web/src/features/checkout/start-checkout/after-enroll-note.tsx` (new; tested through `enroll-button.test.tsx`)
        - The `start-checkout/` folder reaches the file limit with this one.
      - [enroll-button.tsx](../web/src/features/checkout/start-checkout/enroll-button.tsx) (the note and the full width)
      - [page.tsx](../web/src/app/%28shop%29/courses/%5BcourseId%5D/page.tsx) (puts the button inside the panel)
      - `tests/browser/courses/get-course.spec.ts` (it checks for "12 enrolled" today and must check for no count)
    - *Settled*:
      - Wireframe notes 5, 11, 20 and 24.
      - The rewritten *buy buttons* Decision row.
      - The *After "Check your email"* Decision row.
    - *Done when*:
      - `check:changed` and the browser suite pass.
      - You walk wireframe states 1, 2 and 5 in `dev:mock`.
  - [ ] **8c.** An upcoming course's panel opens with "Starts Oct 1, 2030", and a course in progress reads "In progress" and "This course has started. You can still enroll." above its button.
    - *Behaviours*:
      - A course is upcoming before its start.
      - It is in progress from its start until its end.
      - It is ended from its end on, which matches the API's 409 rule `endsAt <= now`.
      - Tests pin both edges: at exactly the start the course is in progress, and at exactly the end it is ended.
      - The status line is an eyebrow in `--olive`.
        - Its date is the start date in the course's own zone, written with `dateStyle: "medium"` in en-US.
      - An ended course keeps today's look until 8e: no status line, and the button stays.
      - The page reads the clock after Next's `connection()`, so the stage always comes from the request's own time.
      - On the in-progress course, the `notPurchasable` scenario shows the API's message above the fields, with the typed values kept (wireframe note 14's fallback).
    - *New shared pieces*: the course stage function, used by the page and the panel now and by 8e's ended look next.
    - *Files*:
      - `web/src/features/courses/buy-panel/course-stage.ts` (new, with a test)
      - `buy-panel.tsx` (test updated)
      - [formatters.ts](../web/src/lib/utils/formatters.ts) (adds a date-only formatter beside `dateTimeFormatter`)
      - [page.tsx](../web/src/app/%28shop%29/courses/%5BcourseId%5D/page.tsx)
      - [courses.ts](../web/src/mocks/fixtures/courses.ts) (adds `inProgressCourse`, running 2020 to 2040, to the public list)
      - Tests that count cards go from 4 to 5: `course-list.test.tsx` and `tests/browser/courses/list-courses.spec.ts`.
    - *Settled*:
      - The Principle that the server decides which panel shows.
      - The Decision row on the server picking upcoming, in progress or ended.
      - Wireframe note 13.
    - *Done when*:
      - `check:changed` and the browser suite pass.
      - You walk states 1 and 3 in `dev:mock`, plus `notPurchasable` on the in-progress course.
  - [ ] **8d.** The three "See current courses →" links share one component. *(mechanical)*
    - *Behaviours*:
      - Nothing changes for visitors; the 404 page and the checkout return page keep their link.
      - Each caller sets its own margin.
    - *New shared pieces*: the "See current courses" link, used by the 404 message, the checkout return page and 8e's ended panel.
    - *Files*:
      - `web/src/components/see-current-courses-link.tsx` (new)
      - [not-found-message.tsx](../web/src/components/not-found-message.tsx)
      - [checkout-status-message.tsx](../web/src/features/checkout/success-page/checkout-status-message.tsx)
    - *Done when*: `check:changed` passes with an unchanged test count.
  - [ ] **8e.** A visitor who opens an ended course sees the Ended pill, its date, "This course has ended." and "See current courses →", with no price, fields or button.
    - *Behaviours*:
      - The pill has a `--muted` fill and `--muted-foreground` text, in eyebrow type, with `rounded-full` corners.
      - The date shows the start date only, in the course's zone.
      - The page draws no Enroll button for an ended course, so no form can reach the API's 409.
      - The ended panel is labelled with the course name rather than "Enroll in…".
      - The mock course endpoint answers for the ended course, and the mock list leaves it out, as the API's list does.
      - A browser test checks that the ended course page shows "Ended" and no Enroll button; it is the only check of the page's wiring.
    - *New shared pieces*: none
    - *Files*:
      - `buy-panel.tsx` (test updated)
      - [page.tsx](../web/src/app/%28shop%29/courses/%5BcourseId%5D/page.tsx)
      - [courses.ts](../web/src/mocks/fixtures/courses.ts) (adds `endedCourse`, from 2025, outside the public list)
      - [get-course.ts](../web/src/mocks/handlers/courses/get-course.ts)
      - `tests/browser/courses/buy-panel.spec.ts` (new)
    - *Needs*: 8c, 8d
    - *Settled*:
      - Wireframe note 14.
      - Style guide §7 Badge and §8 ended course.
    - *Done when*:
      - `check:changed` and the browser suite pass.
      - The journey in *Step 8* is walked.
- [ ] **9. Course times in the visitor's words.** The panel shows the course's own time, the visitor's only when it differs, the length, and the status line.
- [ ] **10. Phone buy bar.** A slim bar keeps the button on screen once the panel scrolls away; a tap opens the fields.
- [ ] **11. Fixes from using the page.** The owner's findings from the full walk are fixed.
- [ ] **12. Checkout button cleanup.** A developer reads the enroll button's code in small files, and a renamed error code breaks a test instead of silently dropping "Try again".

Every UI milestone's *Done when* also includes: keyboard only (Enter, Escape, Tab), one mock scenario per state it builds, and the owner's findings fixed in its last commit.

## Terms

- **§ and note numbers.** "§ 11" points into [style-guide.md](style-guide.md). "Note 14" points into the wireframe's numbered annotation list. "State 1b" and "variant d" are headings in the wireframe's purchase-area and time sections.
- **Twin code.** Existing code that the new work must share with, or copy the pattern from (for example the course card and the course page both format times). Found by grep; listed in each step's *Size*.
- **Journey, walked.** The steps the owner does by hand in `yarn --cwd web dev:mock`, with the screen expected at each step. "Walked" means the owner did them in Chrome at 400 px and at desktop width.
- **Owner's findings.** What the owner notes while walking a journey.
- **Re-measure.** A command that measures a fact that changes (counts, lists), so the doc never holds a stale number.
- **Blocks the split / Can wait.** An open question either changes how a milestone divides into commits (blocks the split) or one commit can decide it alone (can wait). Format: [milestone-line.md](../.claude/skills/_shared/milestone-line.md).
- **Failure table.** A table in a payments plan pass of what can fail and what the visitor sees for each.
- **Shop layout.** [layout.tsx](../web/src/app/%28shop%29/layout.tsx), the layout shared by every public page.

## Journeys

- J1: a visitor on a phone reads a long description, taps the bar, the fields open, they pay on Stripe, and they come back to the success page. Works after 10.
- J2: a keyboard visitor enrolls in a free course and hears "Check your email" after focus moves to the notice. Works after 3.
- J3: a visitor in Tokyo opens an ended course from an old link. They see the Ended pill and "See current courses", and no form. Works after 9.

The finished page (desktop; the phone stacks the panel under the summary). Each step below sketches how the page looks once that step ships.

```
+--------------------------------------------------------------+
| Embodying Emptiness                      Courses   (☰ phone) |
+--------------------------------------------------------------+
| [ image 16:9 ]                    | +----------------------+ |
| React Fundamentals (h1)           | | STARTS DEC 1, 2026   | | sticky 96px
| summary                           | | Tue, Dec 1, 6–8 PM EST | |
|                                   | | (3–5 PM PST your time) | |
| description (h2–h4, lists, quote) | | 2 hours              | |
|                                   | | $99                  | |
|                                   | | [Enroll for $99 →]   | | → Name, Email, [Continue to payment →]
|                                   | | After you enroll.    | | → loading · error alert · Check your email
|                                   | +----------------------+ | Ended: pill, sentence, ghost link
+--------------------------------------------------------------+
| Embodying Emptiness                      Courses   Contact   |
+--------------------------------------------------------------+
phone: panel under the summary; once scrolled past: [Enroll for $99 →] bar
```

Wireframe states and time variants, by the milestone that builds them:

| Wireframe | Milestone |
|---|---|
| 1b and 2b (fields open), 5 (check your email), 7b (sending, free) | 2 |
| 6b (email field error) | 3 |
| 6a (payment provider down), 7a (opening payment), 1b with the paid button | 4 |
| 1, 2, 3, 4 (upcoming paid, upcoming free, in progress, ended) | 8 |
| Time variants a to g and the status line | 9 |

## Mocks and commands

- **`dev:mock`** picks one scenario through the single hand-edited line `const scenario = "success"` in [server.ts](../web/src/mocks/server.ts). Each endpoint's handler file exports one named handler per scenario, and an endpoint without the chosen one falls back to its `success`.
- **Playwright and Vitest** pick nothing: each test lists its own handlers (`mswHandlers`).
- **In this area** every state gets a named handler, so the owner can walk it by editing that one line. Names to use: `redirect`, `checkEmail`, `nameInvalid`, `emailInvalid`, `notPurchasable`, `paymentProviderDown`, `slow`, plus one handler per checkout status.
- **Courses are not scenarios.** The mock course endpoint answers with the fixture whose id is in the URL, and the home list links to each one, so the owner opens the free course from the home page and the chosen scenario applies to its form.
- **Commands** (from the repo root): `yarn --cwd web dev:mock`; `yarn --cwd web check:changed` to check a commit; `yarn --cwd web test:browser` for the Playwright suite, started with `run_in_background` and never twice at once.

## Principles

- **The server decides which panel shows; the browser only refines words.** The server picks the panel (the form, the in-progress note, or Ended) from its clock at request time and renders the absolute status ("Starts Dec 1, 2026"). After the page loads the browser may swap only the status words ("Starts in 4 days", "Starts tomorrow") and add the visitor-time line. The panel never changes shape.
- **Client components get plain public strings.** No enrollment count, no whole course object, nothing that reveals who owns a course.
- **The visitor reads plain words.** The API's details show unchanged, and the browser's own checks use the same words.
- **One primary button on screen.** One button changes its label; the phone bar hides while the inline panel shows.
- **Every UI milestone is walked** in `yarn --cwd web dev:mock` in Chrome at 400 px and at desktop, keyboard only, with a mock scenario for every state it builds (Stripe down, field errors and an ended course included).
- **Payments milestones (2 to 5)** carry a failure table, and `/security-review` runs on every commit.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| This area builds payments step 6; payments.md points here | Without it, two docs would plan one panel | Building it under payments: the panel's states live in this wireframe |
| Tokens, fonts and Button/Input sizes are milestone 1 here, and tick the style guide's first two items | Each later milestone is walked in its final look | Doing it after the buy flow (a second restyle later); leaving it in the guide (a dependency outside this area) |
| DM Sans and Playfair Display, loaded by `next/font` (served from our origin), replace Inter | The guide names both | Keeping web.md's "Inter is the one font" |
| The API words checkout name and email errors plainly, and the browser checks both first with the same words | A typo shows without a request, and whatever the browser misses still reads plainly | Browser only (Zod's "Invalid email address" leaks for `a@b`); API only (a request per typo) |
| One error mapper in `lib/api/`, shared by admin and checkout | code.md says share first; payments planned `form-errors.ts` | A checkout copy |
| The server picks upcoming, in progress or ended and formats the course-zone line; the browser adds only the visitor line and relative words | The panel never flips after load, it agrees with the API's 409, and the browser never re-formats a server string, so hydration can't mismatch | All in the browser (a wrong clock hides the form); all on the server (it can't know the visitor's zone) |
| The locale comes from `Accept-Language`, parsed by our own small function that drops `*` and bad tags and sorts by q | Variants d and e need it; Intl accepts any valid tag, so no matching list is needed | [`negotiator`](https://github.com/jshttp/negotiator) + [`@formatjs/intl-localematcher`](https://formatjs.github.io/docs/polyfills/intl-localematcher/): two dependencies to match against a list we don't have; fixed `en-US` breaks d and e |
| `Intl.DateTimeFormat` writes every time string; `temporal-polyfill` does only arithmetic (the UTC offset at the start instant in both zones, calendar days to the start in the visitor's zone, the length) | One source of wording, and the arithmetic Intl can't do cleanly | Temporal formatting (a second way to write the same strings) |
| No live clock; a course that ends mid-visit gets the API's 409 message | Note 14 covers it | A timer that re-renders |
| The page's half of courses.md *Course images*, item 5 (image route, `next/image`) is built here; the 1200px frame includes its 48px padding, so seven columns are about 631px (the image's `sizes` says so), inside the old 800px cap (revisit after use) | The image lands with its layout. Cards stay without images until the homepage redesign. A `sizes` hint that matches the real width saves phones and desktops from downloading a larger file than they show | An 800px single column (it clashes with the grid); a 1296px outer frame, which gives the wireframe's 680px columns but contradicts the row that fixes the frame at 1200px with 48px padding |
| Step 2 puts a bare Enroll button and the form block under today's details list; step 7 moves them into the grid and step 8 wraps them in the panel | The riskiest milestone (payments) stays free of layout and panel work | Building the panel in step 2 (it pulls steps 7 and 8 into it) |
| Desktop: columns 1–7 plus a panel in 9–12, sticky at 96 px; phone: the panel inline plus a bar (revisit after use) | Notes 1 and 21 | A dialog (note 2); a bar alone (note 21) |
| The phone menu is shadcn's [Sheet](https://ui.shadcn.com/docs/components/sheet) | Its focus trap and Escape key come built in | A panel we build ourselves |
| The phone menu sheet uses `--background`, not shadcn's white `--popover` | A full-height white panel clashes with the cream page | Changing `--popover` (turns dropdowns and dialogs cream too); editing sheet.tsx's default (a shadcn update overwrites it) |
| The buy action returns the typed name and email, and the fields take them as their start values; the browser check is a Zod `safeParse` on submit | React 19 clears uncontrolled fields after every action, even one that fails; this puts the typed values back with about 10 lines | react-hook-form (a schema, a resolver and an error mapping for two fields; the form can't submit without JavaScript) |
| With JavaScript off, the closed Enroll button does nothing | Owner choice: the no-JavaScript path isn't worth a second way to open the fields | A small GET form that reloads with the fields open (about 15 lines plus a test) |
| The course line is one `formatRange` string inside one `<time dateTime={startTime}>`; the card keeps `CourseSchedule`, and web.md's row is narrowed to the card | Note 6's one-line format; screen readers ignore `datetime`, so losing the end's value changes nothing a visitor notices | `formatRangeToParts` with a `<time>` for each end (about 25 lines plus tests) |
| Admin's course-length formatter moves to shared code, so the page reads "1 hour 30 minutes" and "2 days 2 hours" | One rule for one fact; admin and the page never show the same length two ways | The guide's "90 min" as a second rule; `Intl.DurationFormat` (writes units in the visitor's language inside English sentences) |
| The mock checkout's redirect goes to the success page on another origin, `http://pay.localhost:3000/checkout/success?checkoutId=cs_test_mock` | Next does a full page load only for another origin, like real Stripe, so Back reaches the back-forward cache; the dev server allows `*.localhost` with no config | The same origin (an in-app move that never shows the stuck button); `127.0.0.1` (the dev server blocks its scripts there without `allowedDevOrigins`); a real Stripe URL (walks need the internet); a stand-in Stripe page that exists only while mocking (about 30 lines, a guard and a test) |
| A paid form's button reads "Try again →" after a 503, a 500 or our `API_UNREACHABLE` problem; every other failure keeps "Continue to payment →", and a free form never changes (revisit after use) | A retry can fix only those three; the style guide's "Payment failure" row | Stripe down only (our "Try again in a moment" under a Continue button); every failure (a retry can't fix a typo or an ended course) |
| On a back-forward cache restore the form remounts with the typed values; unit tests cover it, because Chromium under `yarn dev` reported `masked` and never restored the page | The cached page keeps the send pending forever and blocks the next one | `location.reload()` (one line, but the visitor retypes); clearing React's pending flag (React offers no way) |
| The browser spec checks only the no-cache Back (a fresh page with the closed button); it keeps Playwright's default Chromium, which disables the cache | Chromium under `yarn dev` never restored the page even with the flag removed (`notRestoredReasons` read `masked`), so a restore spec cannot pass; owner choice, Safari doesn't run on Linux | A WebKit project (an install in CI and a slower suite); a one-off WebKit run |
| Contact is a `mailto:` link from the setting `CONTACT_EMAIL`, read once and checked at boot like `API_BASE_URL`; the wordmark is "Embodying Emptiness", one constant shared with the site title | The link always goes somewhere, and the header and tab title always agree | Leaving Contact out (departs from the wireframe); "Course Merchant" |
| The course image has `alt=""`; wireframe note 23 says so | The h1 right below names the course, so a screen reader would read the name twice; keeps courses.md's row and guide §6 | The course name as alt text |
| Fixtures keep fixed times that hold for years (upcoming 2030, ended 2025, in progress 2020–2040); tests set the browser's clock with Playwright's [`page.clock`](https://playwright.dev/docs/clock); one `dev:mock`-only scenario uses times relative to now for walking "Starts in 4 days" | Failures repeat (web.md's fixtures row), and the default `dev:mock` course stays upcoming | Every fixture relative to now (results depend on the day) |
| After about a minute the return page stops checking and says "We've received your payment. Your access email can take a few minutes. If it hasn't arrived, look in spam, or reload this page to check again." whatever the status | A buyer reaches the page only after Stripe took the card, so "pending" means our server hasn't processed Stripe's webhook yet, and the sweeper rechecks late payments every 10 minutes. The words claim no delivery, so they stay true if a refund follows; a reload starts a fresh minute, so the closing hint works | "Your email is on its way" (a promise that fails if a refund follows); polling without end (a spinner with no outcome) |
| The return page shows "Thank you." for pending and succeeded, and "Checkout timed out." and "Payment refunded." for the others, with one sentence and a ghost "See current courses →"; the Check your email box names no address (revisit after use) | The status answer holds no email; the refunded sentence matches the refund emails and stays true for a double purchase, where the buyer keeps access | Echoing the address (style guide §12 #4: an API change, and anyone with the link would see the email); a resend link (no endpoint) |
| When the API answers 500 the return page shows its words in the error box, and when it can't be reached the shop error page shows; checking stops either way | Same as the course page, no extra code; the payment is safe and a reload checks again | Keeping the confirming line and checking on (hides the API's words; about 10 lines plus tests) |
| While pending, the browser re-asks every 5 seconds for 60 seconds from page open | The webhook usually lands within seconds; at most 12 requests per visit | Every second (5× the requests); backoff (more code for a one-minute window); a minute kept across reloads (a timestamp in the URL) |
| Hover colours are tokens (`--primary-hover`, `--secondary-hover`) in globals.css | The contrast spec reads every pair from the page, so the hover pairs get checked like the rest, and each colour lives in one place | Raw oklch values in button.tsx (the spec can't see them, so two places change) |
| Headings take Playfair from `font-heading` plus a `text-h*` step on each heading; Playfair loads weight 400 only, and DM Sans loads as its variable font | A base rule on h1–h3 would turn alert titles and the description's headings serif, and render the existing bold headings in a fake bold; one heading weight keeps the download small | A base rule (one line, but every heading changes at once); Playfair variable (a bigger file for weights the guide bans) |
| The Button primitive carries height, padding, label, radius, colours, ring and the 11rem minimum (link variant exempt); each public buy button adds full width itself, at every width (step 8) (revisit after use) | Full width in the primitive would stretch admin's Remove and Cancel on a phone and break the price row; the wireframe draws the buy buttons full width, lined up with the Name and Email boxes | Full width in the primitive; full width below sm only (a 180px button under 330px fields) |
| ProblemAlert takes a title and detail and is the one error box; the shop error page uses it | Today two files copy one class string; this keeps shadcn files untouched | shadcn Alert with local edits (an avoidable primitive edit, and a second box beside StickyFormNotice) |
| The §11 check is a browser spec reading root tokens with `getComputedStyle`, sharing the border spec's colour helpers | The browser resolves `var()`, one set of helpers serves both specs, and the spec checks surfaces no page shows yet | A Vitest test parsing globals.css (a second copy of the helpers and a hand-made `var()` resolver) |
| The mock course endpoint answers with the fixture whose id is in the URL, and the mock home list shows every public fixture | Any checkout scenario then works on the free course (and later the in-progress and ended ones) with one `scenario` line | A `freeCourse` scenario plus per-scenario pairings in server.ts (about 6 lines now, one more per later walk; names multiply, and a missed pairing shows the paid course with no form) |
| The API words a bad email as "…It should look like name@example.com." | The wireframe's "include an @" misleads on `a@b` | The wireframe sentence |
| The action catches a thrown API call and returns fixed words with the typed values | An unreachable API sends no text to show, and the visitor keeps their typing (note 17's "API's own message" covers answers only) | The full-page error (the visitor retypes) |
| The header shows no scroll shadow and no current-page pill, though style guide §7 describes both | The wireframe draws neither, and with one link the pill would mark only the home page (revisit after use) | Both now (a client component watching scroll and the path, about 40 lines plus tests); the pill only (about 15 lines) |
| The wordmark links to the home page in the header and the footer | Without it, a phone visitor must open the menu to go home (revisit after use) | Plain text as drawn (one fewer link, two taps home) |
| The header is 56px tall below `md` and 72px from `md` | A sticky 72px bar covers a tenth of a phone screen, and step 7's phone Enroll bar takes more; the desktop panel's 96px top still measures from 72px | 72px everywhere, as the guide first said |
| A root `not-found.tsx` inside the public page layout answers unknown URLs and an admin URL for a missing course | Next sends every unmatched URL there, and the visitor keeps a way back | Next's bare default (no way home but Back); `global-not-found` (experimental, and it skips the layout, so it must re-import styles and fonts) |
| The course image goes through Next's resizer (`localPatterns`, `qualities: [75]`, `preload`) | Phones download a smaller file | Serving the API's 1600×900 file unoptimized (shapes what visitors get to suit a test) |
| The browser spec checks the image's box and address, not its pixels; the `dev:mock` walk shows it loading | Next's resizer fetches our route through an internal request that drops Playwright's mock-proxy header (`fetchInternalImage` in Next's `image-optimizer.js`), so the resized image can't load under the test proxy | Disabling the resizer in tests only (the test would check a different page than visitors get) |
| The public page frame is 1200px wide with 48px side padding from `md` | Style guide §4 and the wireframe; the side column gets its drawn width (revisit after use) | Today's 1152px with 24px padding (narrower side column) |
| The course page's DOM order is summary, details and button, then description; on desktop the grid places the side column across both rows | Phone and keyboard order match what the visitor sees, and the button comes before 5,000 characters of text (revisit after use) | Description first with CSS `order` (phone tab order jumps around); two copies of the panel (two buttons) |
| The shared description class sets headings, lists, quotes and links; only the public page sets the muted body-lg text | The admin edits in the public structure while typing in full-contrast 16px text | Muted text in the editor too (lower contrast while typing) |
| Prices use one formatter with `trailingZeroDisplay: "stripIfInteger"`, and 0 reads "Free", on the page, the button and the card | Style guide §8 writes "$99", "$49.50" and "Free"; one rule for one fact | Page-only formatting (the card and the page would show one price two ways); hand-written trimming (Intl does it) |
| After "Check your email" the note under the button hides and the price stays; the note sits beside the button in checkout code (revisit after use) | The note's promise has come true, and the price records what was paid | Hiding the price too, as wireframe 5 draws it (the price moves into client code, about 30 lines, and the panel shrinks as focus lands); keeping both (the note repeats the notice) |

## Step 1. Site look

```
Course page after 1 (same layout as today, new colours and type)
+----------------------------------------------+
| React Fundamentals          <- Playfair, h1  |
| A hands-on introduction...  <- DM Sans, muted|
| What you will cover. ...    (description)    |
| Price       $99.00                           |
| Schedule    Dec 1, 2026, 6:00 PM –           |
|             Dec 1, 2026, 8:00 PM             |
|             America/New_York                 |
| Enrollment  12 enrolled                      |
+----------------------------------------------+
Admin: green 48px buttons, 3:1 field borders, 2px focus ring
```

- Why here: the owner chose to land the look first, so every later milestone is built and walked in its final colours and type. Approving this plan approves the guide's "[proposed]" tokens, which the wireframe already uses.
- Needs: none.
- Builds on: style guide §2, §3, §5, §7, §10, §11 and its Status items 1–2; [globals.css](../web/src/app/globals.css); [layout.tsx](../web/src/app/layout.tsx); [button.tsx](../web/src/components/ui/button.tsx) and [input.tsx](../web/src/components/ui/input.tsx) (web.md's shadcn local-edit row); [field-border-contrast.spec.ts](../web/tests/browser/admin-courses/field-border-contrast.spec.ts).
- Size: 3 to 4 commits (tokens; fonts and type scale; Button and Input changes marked as local edits; hard-coded gray and red classes moved onto tokens). Twin code: every admin page uses these tokens and primitives.
- Risk: the recolour and the primitive changes cause admin regressions.
- Done when: the existing border-contrast test covers the new surfaces and one new test covers the §11 text pairs (the plan pass picks its file); the browser suite passes; journey: open admin create, admin edit and the home page at 400 px and at desktop, and see green buttons, 3:1 field borders and the focus ring on Tab.
- Design notes *(temporary)*:
  - Each primitive edit starts with web.md's `// Local change:` comment.
  - Tokens with no user yet (`--surface-alt`, `--surface-dark`, `--olive`, `--success-foreground`, the display and eyebrow steps): the token spec checks them now, and steps 6 to 9 use them.
  - The dark rows of style guide §2 wait for future-milestones *Dark admin*, because nothing in the code turns `.dark` on. Style guide Status 1 is ticked for light tokens only.
  - StickyFormNotice keeps its own box, because it is sticky and carries status as well as errors.
  - `next/font` renames families to `__Playfair_Display_<hash>`, so font tests match `/Playfair/`.
  - Flow diagram: none, because the milestone adds no logic branch.

## Step 2. Free enrollment from the course page

```
Free course page after 2 (new block under today's details list)
| React... title, summary, description             |
| Price       $0.00        <- "Free" in step 8      |
| Schedule    ...                                   |
| Enrollment  0 enrolled                            |
|                                                   |
| [ Enroll for free → ]           (closed, first load)
|        | press
|        v
| +-- error box (only after a failed send) -------+ |
| | Course not purchasable                        | |
| | This course has ended and can no longer ...   | |
| +-----------------------------------------------+ |
| Name   [ Ami Cohen        ]   <- focus on open    |
| Email  [ ami@example.com  ]                       |
|        We send the course link to this address.   |
| [ Email me the link → ]  -> [ Sending… ◌ ]        |
|        | check_email
|        v
| +-----------------------------------------------+ |
| | ✓ Check your email          <- focus here     | |
| |   We've sent access to ami@example.com. It    | |
| |   can take a few minutes. If it hasn't        | |
| |   arrived, look in spam.                      | |
| +-----------------------------------------------+ |
Paid course page: unchanged (no button until step 4)
```

- Why here: the thinnest path through every layer (page, Server Action, API, email), and the riskiest area. The form goes under today's details list; steps 7 and 8 move it.
- Needs: 1.
- Size: 3 commits (sample data; the server half; the form). The overview said 4: the API wrapper has no user without the action, and the fields and the confirmation are two states of one form. Twins: [problem-alert.tsx](../web/src/components/problem-alert.tsx), [field.tsx](../web/src/components/ui/field.tsx).
- Risk: React 19 clears uncontrolled fields after an action (see Decisions). 2a moves the mock courses to fixed dates that hold for years (`reactCourse` upcoming in 2030) and adds `freeCourse`; the card and detail tests assert the old 2026 dates as literals, so they change in that commit.
- Test data: `freeCourse` (price 0, upcoming 2030) from 2a; `startCheckoutHandlers` `success`, `slow` and `notPurchasable` from 2b. `inProgressCourse` and `endedCourse` arrive in step 8, the first step that uses them.
- Done when: journey J2 at the free-course mock: press Enroll for free, see focus land on Name, send, see Sending…, then the notice with focus on it.
- Retro:
  - Planned 3 commits (2a, 2b, 2c); shipped 3.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: a pending async action blocks every later action in the test run, so unit tests finish each held action.

## Step 3. Mistakes in plain words

```
Course page after 3 (the same block, errors added)
Field error (browser check, or the API's 400):
| Name   [ Ami Cohen        ]                       |
| Email  [ ami.example.com  ]   <- red border        |
|        That email address looks incomplete.       |
|        It should look like name@example.com.      |
| [ Email me the link → ]                           |

Course error (the API's 409, shown above the fields):
| +-----------------------------------------------+ |
| | ! Course not purchasable                      | |
| |   This course has ended and can no longer ... | |
| +-----------------------------------------------+ |
| Name   [ Ami Cohen        ]   <- typed values stay |
| Email  [ ami@example.com  ]                       |
```

- Why here: the errors belong to the form built in 2 and decide the shared mapper before paid enrollment reuses it.
- Needs: 2.
- Size: 5 commits (the overview said 3 to 4: the API-down case and the shared mapper each need their own). Twins: [course-form-path.ts](../web/src/features/admin-courses/save-course/course-form-path.ts) (admin), [email.schema.ts](../api/src/common/validation/email.schema.ts) (shared with admin login).
- Risk: rewording the shared email schema changes admin login's message; the web app has no login form yet, so only API callers and API specs see it.
- Done when: journey: type `ami.example.com`, see the email message under Email; send a valid address for an ended course, see the API's 409 above the form with both values still typed.
- Retro:
  - Planned 5 commits (3a to 3e); shipped 5.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: React 19 clears the typed values after a submit, so the browser check calls `preventDefault` in `onSubmit` to keep them.

## Step 4. Paid enrollment goes to Stripe

```
Paid course page after 4 (under today's details list)
| [ Enroll for $99.00 → ]        closed, first load             |
|        | press                                                |
| +-- error box (only after a failed send) ------------------+  |
| | ! Payment provider unavailable                           |  |
| |   Payments can't be taken right now. Try again later.    |  |
| +----------------------------------------------------------+  |
| Name   [ Ami Cohen        ]   <- focus on open, values kept   |
| Email  [ ami@example.com  ]                                   |
|        We send the course link to this address.               |
| [ Continue to payment → ] -> [ Opening payment… ◌ ] -> Stripe |
|   (reads [ Try again → ] after a 503, 500 or API down)        |
| Back from Stripe: the same fields and values, Continue again  |
Free course page: unchanged
```

- Why here: the redirect only adds to the form from 2 and 3.
- Needs: 3.
- Size: 3 commits (words and redirect; Back from Stripe; Try again). The overview said 2 to 3; the Back fix stands alone because its risk needs a browser check, and it comes before Try again so the risk retires early.
- Risk: pressing Back from Stripe makes the browser show its frozen copy of the page (the back-forward cache), so the visitor would see the button stuck on "Opening payment… ◌" with read-only fields and need a reload. Direction: on the `pageshow` event with `persisted` true, the form starts over (the button returns to "Continue to payment →", the fields become editable, the typed values stay). The check in Chromium under `yarn dev` found it never restores the page (`notRestoredReasons` read `masked`), so unit tests with a fake `pageshow` cover the restore; a walk against a production build remains open.
- Done when: journey: continue to payment, land on the mock success page, press Back and find a usable form; with the Stripe-down scenario, see the API's message, the kept values and Try again.
- Retro:
  - Planned 3 commits (4a to 4c); shipped 3.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: the browser's back-forward cache never restores the page under `yarn dev`, so unit tests with a fake `pageshow` cover the restore.

## Step 5. Coming back from Stripe

```
/checkout/success after 5 (shop layout; the words are final)
Succeeded                              Pending (first minute)
Thank you.                (h1)         Thank you.                (h1)
+-------------------------------+      ◌ We're confirming your payment.
| ✓ Check your email            |        This page updates by itself.
|   We've sent access to the    |
|   email address you entered.  |      Pending (after a minute, no spinner)
|   It can take a few minutes.  |      Thank you.
|   If it hasn't arrived, look  |      We've received your payment. Your access
|   in spam.                    |      email can take a few minutes. If it
+-------------------------------+      hasn't arrived, look in spam, or
                                       reload this page to check again.

Expired                                Refunded
Checkout timed out.       (h1)         Payment refunded.         (h1)
This checkout ended before payment,    We've refunded this payment. It can take
so we charged you nothing.             a few days to appear on your statement.
See current courses →  (ghost)         See current courses →  (ghost)

Unknown or missing id (not-found)      API 500
Checkout not found        (h1)         +-- error box ----------------------+
We couldn't find a checkout for this   | ! <API title>                     |
link. If you paid, look in your email  |   <API detail>                    |
for your access link.                  +-----------------------------------+
See current courses →  (ghost)
```

- Why here: J1 ends here; the API's success URL already points at `/checkout/success`.
- Needs: 4.
- Builds on: [web.md](web.md)'s row on the checkout success page, [start-checkout.api.ts](../web/src/features/checkout/start-checkout/start-checkout.api.ts) (the wrapper to copy), [check-email-notice.tsx](../web/src/features/checkout/check-email-notice/check-email-notice.tsx), [not-found.tsx](../web/src/app/%28shop%29/courses/%5BcourseId%5D/not-found.tsx), [error.tsx](../web/src/app/%28shop%29/error.tsx), `getCheckoutStatus` in the OpenAPI contract.
- Size: 4 commits (the overview said 2 to 3: the checkout folder needs its regroup first, and the re-checking stands alone because it needs fake timers and a browser clock).
- Risk: the page is not in the wireframe; its look follows style guide §12 #4 minus the email echo and the resend link.
- Done when: journey (`dev:mock`, 400 px and desktop, keyboard only): from `redirect`, pay a paid course and see Check your email; under `checkoutPending` see the confirming line, and after a minute the received-payment sentence; under `checkoutExpired`, `checkoutRefunded`, `checkoutNotFound`, `checkoutServerError` and `unreachable` see their screens; with no `checkoutId`, see the not-found page.
- Retro:
  - Planned 4 commits (5a to 5d); shipped 4.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: a test double for `useRouter` must return the same object on every render, because a new one restarts the timers and the pending notice never gives up.

## Step 6. Site header and footer

```
Every public page after 6
Desktop                                    Phone
+--------------------------------------+   +-----------------------+
| Embodying Emptiness (link)  Courses  |   | Embodying Emptiness ☰ |
+--------------------------------------+   +-----------------------+
| (course page as after 4)             |   | ☰ opens a full-height |
|                                      |   |   sheet from the right|
|                                      |   |   [x]                 |
|                                      |   |   Courses (48px row)  |
+--------------------------------------+   +-----------------------+
| Embodying Emptiness  Courses Contact |   | Embodying Emptiness   |
+--------------------------------------+   | Courses               |
                                           | Contact (mailto)      |
/nope: Page not found (h1)                 +-----------------------+
       This page doesn't exist. The link may have a typo, or the page has moved.
       See current courses →  (ghost)
```

- Why here: the sticky panel's 96px top is measured from the desktop header's 72px.
- Needs: 1.
- Builds on: [layout.tsx](../web/src/app/%28shop%29/layout.tsx) (the shop layout), [layout.tsx](../web/src/app/layout.tsx) (the title template), [api-config.ts](../web/src/lib/api/config/api-config.ts) and [base-url.ts](../web/src/lib/api/config/base-url.ts) (the twin of the Contact setting), [instrumentation-node.ts](../web/src/instrumentation-node.ts), [alert-dialog.tsx](../web/src/components/ui/alert-dialog.tsx) (a sibling Base UI primitive), the two existing `not-found.tsx` files, style guide §7 (*Nav header*, *Footer*), and the wireframe's `.site-header` and `.site-footer` rules.
- Size: 4 commits (the overview said 2 to 3: the unknown-URL page and the Contact setting each stand alone, so every commit stays within 6 files).
- Done when: journey (`dev:mock`, 400 px and desktop, keyboard only): the same header and footer show on the home, course, course 404 and `/nope` pages; at 400 px open the menu, press Escape and see focus back on the menu button; the footer's Contact link opens a mail to `CONTACT_EMAIL`.
- Retro:
  - Planned 4 commits (6a to 6d); shipped 4.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: the shadcn CLI asks before overwriting `button.tsx`, which carries a local change, so `shadcn add` needs a "no" answer to keep it.

## Step 7. Course page layout

```
Course page after 7
Desktop (frame 1200px, 48px sides)             Phone (24px sides)
+------------------------------------------+   +------------------+
| header 72px                              |   | header 56px   ☰  |
| [ image 16:9, alt="" ]  | Price $99.00   |   | [ image 16:9 ]   |
| React Fundamentals (h1) | Schedule ...   |   | React Fund... h1 |
| summary (muted)         | 12 enrolled    |   | summary          |
| description, rich text: | [Enroll ... →] |   | Price / Schedule |
|  h2 · lists · quote ·   |  ^ sticky 96px |   | 12 enrolled      |
|  divider · links        |  (a panel in 8)|   | [ Enroll ... → ] |
|  cols 1–7               |  cols 9–12     |   | description ...  |
| footer                                   |   | footer           |
+------------------------------------------+   +------------------+
While the image loads: an empty 16:9 box, so nothing below it moves.
```

- Why here: the layout needs the header (6) and the form (2) to arrange.
- Needs: 2, 6.
- Size: 5 commits (handler folders; image route; image on the page; grid; description styles); the handler folders came first because `mocks/handlers/` held 10 files. Twins: [course-details.tsx](../web/src/features/courses/course-details.tsx), `.description-content` in globals.css (shared with the admin editor), courses.md *Course images*, item 5 (*Showing it*). Cards keep no image until the homepage redesign, so that item stays open for the card half.
- Builds on: [course-details.tsx](../web/src/features/courses/course-details.tsx), [the course page route](../web/src/app/%28shop%29/courses/%5BcourseId%5D/page.tsx), [site-header.tsx](../web/src/features/site-layout/site-header.tsx) (the 56px and 72px heights the sticky top measures from), `.description-content` in [globals.css](../web/src/app/globals.css), courses.md *Course images*, style guide §7, the wireframe's course page grid, and the Decision rows on the desktop panel and the header heights.
- Risk: restyling `.description-content` changes the admin editor.
- Done when: journey: scroll the course page at 1280 px and see the panel stay 96px under the header; at 320 px a long name wraps; a slow image keeps its 16:9 box.
- Retro:
  - Planned 5 commits (7a to 7e); shipped 5.
  - Owner changes after using the page: not yet recorded.
  - Rule friction: the editor's `text-base` beat the shared class, so the editor drops it and the public wrapper adds the muted body-lg text.

## Step 8. Buy panel looks

```
The buy panel after 8 (times still in today's format)
Upcoming, paid (8a–8c)            In progress (8c)                  Ended (8e)
+---------------------------+     +---------------------------+     +---------------------------+
| STARTS OCT 1, 2030        |     | IN PROGRESS               |     | ( ENDED )                 |
| Oct 1, 2030, 2:00 PM –    |     | Jan 1, 2020, ... –        |     | Sep 1, 2025               |
|   Oct 1, 2030, 4:00 PM    |     |   Dec 1, 2040, ...        |     | This course has ended.    |
| America/New_York          |     | America/New_York          |     | See current courses →     |
| $99                       |     | $99                       |     +---------------------------+
| [   Enroll for $99 →    ] |     | This course has started.  |
| After you enroll.         |     | You can still enroll.     |
| You pay on Stripe's ...   |     | [   Enroll for $99 →    ] |
+---------------------------+     | After you enroll. ...     |
                                  +---------------------------+
Free: "Free" in the price row, [Enroll for free →], the note without Stripe.
After Check your email: the notice replaces the button and the note; the price stays.
On a phone: the same panel at full width, under the summary.
```

- Why here: the panel exists in the layout, so its states have a place.
- Needs: 7.
- Builds on: [course-details.tsx](../web/src/features/courses/course-details.tsx), [enroll-button.tsx](../web/src/features/checkout/start-checkout/enroll-button.tsx), [formatters.ts](../web/src/lib/utils/formatters.ts), [not-found-message.tsx](../web/src/components/not-found-message.tsx), [checkout-status-message.tsx](../web/src/features/checkout/success-page/checkout-status-message.tsx), the fixtures from step 2, wireframe states 1 to 5 and notes 5, 11 to 14, 20 and 24, style guide §7 and §8.
- Size: 5 commits (8a to 8e). The overview said 3 to 4: the price format stands alone because it also changes the card, and the shared "See current courses" link needs its own mechanical commit before the ended look.
- Risk: changing `formatPrice` changes the card.
- Done when: journey (`dev:mock`, 400 px and desktop, keyboard only): open React Fundamentals (state 1), Mindful Breathing (2), the in-progress course (3) and the ended course by its URL (4) and see the screen drawn in the wireframe; send the free form and see the note hide; walk `notPurchasable` on the in-progress course; no page shows an enrollment count.
- Design notes *(temporary)*:
  - Public features don't import each other (web.md), so the page puts the checkout button inside the courses panel as its children.
  - The page works out the course stage once and passes it to the panel, so the panel's tests need no fake clock.
  - **Course stage** means which of upcoming, in progress or ended a course is at request time. It is a new word because "status" already means draft, published or archived.
  - `features/courses/` gets a `buy-panel/` folder, because its root already holds 8 files and 2 folders; `start-checkout/` reaches 10 files with the note.
  - The ended course opens by its URL in `dev:mock`, because the mock list leaves it out, as the API's list does.
  - Admin's price summary keeps its own "$99.00" words, because it repeats what the admin typed.
  - Flow diagram *(temporary)*:

```
Visitor opens /courses/<id>
  Page fetches the course                          existing (7c)
  Page reads the clock after connection()          8c
  Course stage from start, end and now             8c
  ├── upcoming → "Starts <date>" eyebrow           8c
  │     price, button, note                        8b (price words 8a)
  ├── in progress → "In progress" eyebrow          8c
  │     price, limit line, button, note            8c / 8b
  │     late 409 → API message above the fields    existing (3c), walked in 8c
  └── ended → pill, date, sentence, link           8e (link 8d)
        no button, so no request
Visitor presses Enroll → fields open, note stays   existing (2c) / 8b
  └── Check your email → note hides, price stays   8b
```

## Step 9. Course times in the visitor's words

```
The buy panel's top after 9
Visitor in LA, en-US                 Visitor in Tokyo, ended course (J3)
+--------------------------------+   +------------------------------+
| STARTS IN 4 DAYS  <- browser,  |   | ( ENDED )                    |
|    only within 14 days         |   | Dec 1, 2026                  |
| Tue, Dec 1, 6:00 – 8:00 PM EST |   | 2 hours                      |
| (3:00 – 5:00 PM PST your time) |   | This course has ended.       |
|    ^ browser, only if offset   |   | See current courses →        |
|      differs                   |   +------------------------------+
| 2 hours                        |
| $99                            |   en-GB: Tue 1 Dec, 18:00–20:00 GMT-5
+--------------------------------+   de-DE: Di., 1. Dez., 18:00–20:00 Uhr GMT-5
Several days: Dec 1 – 3, 2026 / Tue, Dec 1, 6:00 PM EST – Thu, Dec 3, ... / 2 days 2 hours
```

- Why here: the panel exists (8), so the lines have a place.
- Needs: 8.
- Size: 4 to 5 commits (locale from the request; course line and range on the server; visitor line; relative status words, since 8c builds the fixed ones; shared length formatter). Twins: [course-schedule.tsx](../web/src/features/courses/course-schedule.tsx), [format-course-length.ts](../web/src/features/admin-courses/schedule/summary/format-course-length.ts), `temporal-polyfill`.
- Freshness: reading `Accept-Language` makes the course page render on every request. It already does (it reads `params` and sets no `revalidate`), so caching does not change; the home page stays regenerated each minute.
- Status words: the server renders "Starts Dec 1, 2026"; after load the browser may swap only those words to "Starts in 4 days" (within 14 days), and the panel keeps its shape.
- Risk: Node's and Chrome's ICU format differently, so a server string the browser re-formats would mismatch.
- Done when: browser tests reproduce variants a to g, a DST day and a course past midnight with no hydration warning; journey J3.

## Step 10. Phone buy bar

```
Phone after 10
Top of page              Scrolled into description    After tapping the bar
+------------------+     +------------------+         +------------------+
| header        ☰  |     | header        ☰  |         | header        ☰  |
| [ image ]        |     | ...Before you    |         | $99              |
| h1, summary      |     |    start.        |         | Name [_______]   | <- focus,
| +--------------+ |     | 1. Install ...   |         | Email [______]   |    clear of
| | panel        | |     | > Small apps ... |         | [Continue to     |    the header
| | [Enroll $99→]| |     |                  |         |  payment →]      |
| +--------------+ |     |------------------|         |                  |
| description...   |     |[Enroll for $99 →]| <- bar  | (bar hidden)     |
+------------------+     +------------------+         +------------------+
(no bar: the panel is in view)
```

- Why here: the bar repeats the button the panel (8) already holds.
- Needs: 8.
- Size: 2 to 3 commits.
- Risk: a focused field hidden under the header or the bar.
- Done when: journey J1 at 400 px; the bar never shows beside the inline button, and the last paragraph stays clear of it.

## Step 11. Fixes from using the page

- Why here: the owner's findings from walking everything.
- Needs: 10.
- Size: 2 to 5 commits, set after the walk.
- Done when: J1 to J3 walked again.

## Step 12. Checkout button cleanup

- Why here: the newcomer-reader found two weaknesses in code that predates the 5a regroup; they wait until the page is done so the cleanup touches stable code.
- Needs: 11.
- Findings *(temporary)*:
  - The retryable error codes ("Try again") are plain strings in `enroll-button.tsx`, and the action invents `API_UNREACHABLE` separately. The test repeats the literals. Fix: one exported constant for the code the web app makes itself, imported in all three places.
  - `enroll-button.tsx` runs 246 lines and holds `EnrollForm`, `SendButton`, `FocusedCheckEmailNotice` and the label and retry rules. Fix: move the form and the label rules into their own files, and the focused notice into `check-email-notice/`.
  - The Back-button test "keeps the check-email notice when the page restores after a send" never shows the restore handler ran, because the right outcome is that nothing happens. Fix: restore after a failed send and after a successful one, and compare the two.
  - The test "keeps the typed values beside a field message" types `ami@example.com` while the fake action returns `ami@`, so a reader cannot tell which email the visitor typed. Fix: `submitTypedDetails` types the address the default fake customer holds.
- Size: 2 commits (the shared code; the split), plus the two test fixes in whichever commit touches `enroll-button.test.tsx`.
- Done when: renaming the code fails a test, and `check:changed` passes with an unchanged test count.

## Open questions

- 11, revisit after use: the one-line shift when the visitor's time line appears after the page loads.

## Out of scope

- Everything in the wireframe's "Not in the API" list.
- The homepage and course list redesign (the card keeps its enrollment count, and cards show no image, until then).
- Discounted prices ([future-milestones.md](future-milestones.md)).
- The web admin login.
- A price change between load and submit: Stripe shows the amount charged.
- An empty description: the API refuses one.
- The dark admin palette ([future-milestones.md](future-milestones.md)).
