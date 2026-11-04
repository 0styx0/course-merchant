# Course page

Read this before working on the public course page, its buy panel, the site header and footer, or the return page from Stripe. It records what the code can't tell you: progress, intent, and why. The look to match is [course-page.html](wireframes/course-page.html); its 24 notes give the reason for each element. Related docs: [payments.md](payments.md) (step 6 moved here), [courses.md](courses.md) (the course page's half of *Course images*, item 5, moved here), [style-guide.md](style-guide.md), [web.md](web.md). Run it with `/plan-create-implementation course-page`, then `/next-commit course-page`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. `/plan-create-implementation` splits a milestone into commit lines when it is the one marked next.

- [x] **1a.** Admin and public pages show the guide's light colours, one error box (ProblemAlert) and green success marks through `--success`; the contrast spec checks every light §11 pair.
- [x] **1b.** Every page shows DM Sans (italic file loads too); admin page titles show Playfair Display on the guide's type scale.
- [x] **1c.** Buttons are 48px, with the guide's label, colours and focus ring; the hover colours are tokens, and the alert dialog title uses DM Sans.
- [x] **1d.** Fields are 48px white boxes with `rounded-md`, 1rem text and a destructive border when invalid; any focus, including the status radio, shows the ring.
- [ ] **1e.** Public pages show Playfair titles and the guide's muted text. **Next**
  - *Behaviours*:
    - the home, course and 404 h1 sit at the h1 step (the h2 step at 400px)
    - the course-list h2 and the card h3 sit at their steps
    - summaries, the schedule and the empty-list lines compute to `--muted-foreground`
    - the re-measure colour grep (with `green-`) finds nothing
  - *New shared pieces*: none
  - *Files*:
    - [page.tsx](../web/src/app/%28shop%29/page.tsx), [not-found.tsx](../web/src/app/%28shop%29/courses/%5BcourseId%5D/not-found.tsx)
    - [course-details.tsx](../web/src/features/courses/course-details.tsx), [course-schedule.tsx](../web/src/features/courses/course-schedule.tsx), [course-list.tsx](../web/src/features/courses/list/course-list.tsx), [course-card.tsx](../web/src/features/courses/list/course-card.tsx)
    - `fonts.spec.ts`
    - this doc's tick
  - *Done when*:
    - the browser suite passes
    - journey: open admin create, admin edit, home and a course page at 400 px and desktop
    - each shows green buttons, 3:1 field borders and the ring on Tab
- [ ] **2. Free enrollment from the course page.** A visitor opens the fields in place, sends a name and email, and sees "Check your email".
- [ ] **3. Mistakes in plain words.** A wrong field shows its message under it, other problems show above the form, and the typed values stay.
- [ ] **4. Paid enrollment goes to Stripe.** A paid visitor reaches Stripe, sees the API's message when Stripe is down, and gets a working form back after pressing Back.
- [ ] **5. Coming back from Stripe.** The return page says the email is on its way, or what happened instead.
- [ ] **6. Site header and footer.** Every public page has the header, the phone menu and the footer.
- [ ] **7. Course page layout.** The image, title and description sit beside a sticky panel on desktop, stacked on a phone.
- [ ] **8. Buy panel looks.** The panel shows the price, the button with its price, the after-enroll note, and the free, in-progress and ended looks.
- [ ] **9. Course times in the visitor's words.** The panel shows the course's own time, the visitor's only when it differs, the length, and the status line.
- [ ] **10. Phone buy bar.** A slim bar keeps the button on screen once the panel scrolls away; a tap opens the fields.
- [ ] **11. Fixes from using the page.** The owner's findings from the full walk are fixed.

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

- **`dev:mock`** picks one scenario through the single hand-edited line `const scenario = "success"` in [node.ts](../web/src/mocks/node.ts). Each endpoint's handler file exports one named handler per scenario, and an endpoint without the chosen one falls back to its `success`.
- **Playwright and Vitest** pick nothing: each test lists its own handlers (`mswHandlers`).
- **In this area** every state gets a named handler, so the owner can walk it by editing that one line. Names to use: `freeCourse`, `redirect`, `checkEmail`, `nameInvalid`, `emailInvalid`, `notPurchasable`, `paymentProviderDown`, `slow`, plus one handler per checkout status.
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
| The page's half of courses.md *Course images*, item 5 (image route, `next/image`) is built here; seven columns are 680 px, inside the old 800 px cap (revisit after use) | The image lands with its layout. Cards stay without images until the homepage redesign | An 800 px single column (it clashes with the grid) |
| Step 2 puts a bare Enroll button and the form block under today's details list; step 7 moves them into the grid and step 8 wraps them in the panel | The riskiest milestone (payments) stays free of layout and panel work | Building the panel in step 2 (it pulls steps 7 and 8 into it) |
| Desktop: columns 1–7 plus a panel in 9–12, sticky at 96 px; phone: the panel inline plus a bar (revisit after use) | Notes 1 and 21 | A dialog (note 2); a bar alone (note 21) |
| The phone menu is shadcn's [Sheet](https://ui.shadcn.com/docs/components/sheet) | Its focus trap and Escape key come built in | A panel we build ourselves |
| The buy action returns the typed name and email, and the fields take them as their start values; the browser check is a Zod `safeParse` on submit | React 19 clears uncontrolled fields after every action, even one that fails; this puts the typed values back with about 10 lines | react-hook-form (a schema, a resolver and an error mapping for two fields; the form can't submit without JavaScript) |
| With JavaScript off, the closed Enroll button does nothing | Owner choice: the no-JavaScript path isn't worth a second way to open the fields | A small GET form that reloads with the fields open (about 15 lines plus a test) |
| The course line is one `formatRange` string inside one `<time dateTime={startTime}>`; the card keeps `CourseSchedule`, and web.md's row is narrowed to the card | Note 6's one-line format; screen readers ignore `datetime`, so losing the end's value changes nothing a visitor notices | `formatRangeToParts` with a `<time>` for each end (about 25 lines plus tests) |
| Admin's course-length formatter moves to shared code, so the page reads "1 hour 30 minutes" and "2 days 2 hours" | One rule for one fact; admin and the page never show the same length two ways | The guide's "90 min" as a second rule; `Intl.DurationFormat` (writes units in the visitor's language inside English sentences) |
| The mock checkout's redirect goes straight to the success page with a fake checkout id | One line; Back from the success page still tests the stuck "Opening payment…" button | A stand-in Stripe page that exists only while mocking (about 30 lines, a guard and a test) |
| Contact is a `mailto:` link from the setting `CONTACT_EMAIL`, read once and checked at boot like `API_BASE_URL`; the wordmark is "Embodying Emptiness", one constant shared with the site title | The link always goes somewhere, and the header and tab title always agree | Leaving Contact out (departs from the wireframe); "Course Merchant" |
| The course image has `alt=""`; wireframe note 23 says so | The h1 right below names the course, so a screen reader would read the name twice; keeps courses.md's row and guide §6 | The course name as alt text |
| Fixtures keep fixed times that hold for years (upcoming 2030, ended 2025, in progress 2020–2040); tests set the browser's clock with Playwright's [`page.clock`](https://playwright.dev/docs/clock); one `dev:mock`-only scenario uses times relative to now for walking "Starts in 4 days" | Failures repeat (web.md's fixtures row), and the default `dev:mock` course stays upcoming | Every fixture relative to now (results depend on the day) |
| After about a minute the return page stops checking and says "We've received your payment. Your access email can take a few minutes. If it hasn't arrived, look in spam." whatever the status | A buyer reaches the page only after Stripe took the card, so "pending" means our server hasn't processed Stripe's webhook yet, and the sweeper rechecks late payments every 10 minutes. The words claim no delivery, so they stay true if a refund follows | "Your email is on its way" (a promise that fails if a refund follows); polling without end (a spinner with no outcome) |
| Hover colours are tokens (`--primary-hover`, `--secondary-hover`) in globals.css | The contrast spec reads every pair from the page, so the hover pairs get checked like the rest, and each colour lives in one place | Raw oklch values in button.tsx (the spec can't see them, so two places change) |
| Headings take Playfair from `font-heading` plus a `text-h*` step on each heading; Playfair loads weight 400 only, and DM Sans loads as its variable font | A base rule on h1–h3 would turn alert titles and the description's headings serif, and render the existing bold headings in a fake bold; one heading weight keeps the download small | A base rule (one line, but every heading changes at once); Playfair variable (a bigger file for weights the guide bans) |
| The Button primitive carries height, padding, label, radius, colours, ring and the 11rem minimum (link variant exempt); each public buy button adds full width below sm itself (step 8) (revisit after use) | Full width in the primitive would stretch admin's Remove and Cancel on a phone and break the price row | Full width in the primitive |
| ProblemAlert takes a title and detail and is the one error box; the shop error page uses it | Today two files copy one class string; this keeps shadcn files untouched | shadcn Alert with local edits (an avoidable primitive edit, and a second box beside StickyFormNotice) |
| The §11 check is a browser spec reading root tokens with `getComputedStyle`, sharing the border spec's colour helpers | The browser resolves `var()`, one set of helpers serves both specs, and the spec checks surfaces no page shows yet | A Vitest test parsing globals.css (a second copy of the helpers and a hand-made `var()` resolver) |

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
Course page after 2 (a free course; new block under today's details)
| ...title, summary, description, Price, Schedule...|
|                                                   |
| [ Enroll for free → ]          aria-expanded=false|
|        | click                                    |
|        v                                          |
| Name   [ Ami Cohen        ]    <- focus lands here|
| Email  [ ami@example.com  ]                       |
|        We send the course link to this address.   |
| [ Email me the link → ]   -> [ Sending… ◌ ]       |
|        | check_email                              |
|        v                                          |
| +-----------------------------------------------+ |
| | ✓ Check your email                            | |  <- focus moves here
| |   We've sent access to ami@example.com. ...   | |
| +-----------------------------------------------+ |
```

- Why here: the thinnest path through every layer (page, Server Action, API, email), and the riskiest area. The form goes under today's details list; steps 7 and 8 move it.
- Needs: 1.
- Size: 4 commits (API wrapper and mock fixtures and handlers; the action; fields opening in place; the confirmation). Twins: [problem-alert.tsx](../web/src/components/problem-alert.tsx), [field.tsx](../web/src/components/ui/field.tsx).
- Risk: React 19 clears uncontrolled fields after an action (see Decisions). The first commit moves the mock courses to fixed dates that hold for years (`reactCourse` upcoming in 2030) and adds `freeCourse`, `inProgressCourse` and `endedCourse`; card and detail tests assert the old 2026 dates as literals, so they change in that commit.
- Done when: journey J2 at the free-course mock: press Enroll for free, see focus land on Name, send, see Sending…, then the notice with focus on it.

## Step 3. Mistakes in plain words

```
Course page after 3 (the same block, errors added)
Field error (browser check, or the API's 400):
| Name   [ Ami Cohen        ]                       |
| Email  [ ami.example.com  ]   <- red border        |
|        That email address looks incomplete.       |
|        It should include an @.                    |
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
- Size: 3 to 4 commits (shared error mapper; API rewording; browser check and display). Twins: [field-errors-from-problem.ts](../web/src/features/admin-courses/save-course/field-errors-from-problem.ts) (admin), [email.schema.ts](../api/src/common/validation/email.schema.ts) (shared with admin login). The first commit moves the generic part of the admin mapper into `web/src/lib/api/form-errors.ts`: it takes a function from the API's field pointer to a form path. Admin keeps its own path table and imports it; checkout supplies its two paths.
- Words: the API's name and email messages follow §9 rule 7, with the wireframe's sentence as the model ("That email address looks incomplete. It should include an @."). Name: "Enter your name." The hint under Email ("We send the course link to this address.") is fixed copy from the wireframe, not an API message.
- Risk: rewording the shared email schema changes admin login's message. The web app has no login form yet, so only API callers and API tests see it; the plan pass greps the API tests for the old wording.
- Done when: journey: type `ami.example.com`, see the email message under Email; send a valid address for an ended course, see the API's 409 above the form with both values still typed.

## Step 4. Paid enrollment goes to Stripe

```
Course page after 4 (a paid course)
| [ Enroll for $99.00 → ]        <- price still from today's formatter |
| Name / Email                                      |
| [ Continue to payment → ] -> [ Opening payment… ◌ ] -> Stripe page    |
|                                                   |
| Stripe down (503):                                |
| +-----------------------------------------------+ |
| | ! Payment provider unavailable                | |
| |   Payments can't be taken right now. Try ...  | |
| +-----------------------------------------------+ |
| Name / Email (values kept)                        |
| [ Try again → ]                                   |
| Back from Stripe: the same form, ready to use, never stuck loading   |
```

- Why here: the redirect only adds to the form from 2 and 3.
- Needs: 3.
- Size: 2 to 3 commits.
- Risk: pressing Back from Stripe makes the browser show its frozen copy of the page (the back-forward cache), so the visitor would see the button stuck on "Opening payment… ◌" with read-only fields and need a reload. Direction, confirmed in the plan pass after a check in Chrome and Safari: on the `pageshow` event with `persisted` true, the form drops its sending state (the button returns to "Continue to payment →", the fields become editable, the typed values stay).
- Done when: journey: continue to payment, land on the mock success page, press Back and find a usable form; with the Stripe-down scenario, see the API's message, the kept values and Try again.

## Step 5. Coming back from Stripe

```
/checkout/success after 5 (a new page; the words are set when the milestone is planned)
+----------------------------------------------+
| Pending:   we're confirming your payment     |  <- refreshes for about 1 min
|            (after a minute: "We've received  |
|             your payment. Your access email   |
|             can take a few minutes. ...")     |
| Succeeded: ✓ Check your email ...            |
| Expired / refunded: one plain sentence       |
|            + ghost "See current courses →"   |
| Unknown id: 404 page                         |
+----------------------------------------------+
```

- Why here: J1 ends here; the API's success URL already points at `/checkout/success`.
- Needs: 4.
- Size: 2 to 3 commits.
- Data flow: the server page reads `checkoutId` from the URL and calls `getCheckoutStatus`; a small client component calls `router.refresh()` on a timer while the status is `pending` (web.md's row on the checkout success page). A missing `checkoutId` and the API's 404 both call `notFound()`.
- Words: after about a minute the page stops checking and says exactly "We've received your payment. Your access email can take a few minutes. If it hasn't arrived, look in spam." (see the Decision row). Other screens (set finally in the plan pass, §9 voice): pending "We're confirming your payment."; succeeded the "Check your email" notice without an address (the status answer holds none); expired and refunded one plain sentence each plus a ghost "See current courses →". The same commit changes web.md's "your email is on its way" to these words.
- Risk: the page is not in the wireframe; its look follows style guide §12 #4 minus the email echo and the resend link.
- Done when: journey: open the page with pending, succeeded, expired, refunded and unknown ids, and see the matching screen each time; a pending id stops refreshing after about a minute and shows the sentence above.

## Step 6. Site header and footer

```
Every public page after 6
Desktop                                    Phone
+--------------------------------------+   +-----------------------+
| Embodying Emptiness         Courses  |   | Embodying Emptiness ☰ |
+--------------------------------------+   +-----------------------+
| (course page as after 4)             |   | ☰ opens a full-height |
|                                      |   |   sheet: Courses      |
+--------------------------------------+   +-----------------------+
| Embodying Emptiness  Courses Contact |   | Embodying Emptiness   |
+--------------------------------------+   | Courses               |
                                           | Contact (mailto)      |
                                           +-----------------------+
```

- Why here: the sticky panel's 96px top is measured from the 72px header.
- Needs: 1.
- Size: 2 to 3 commits (header and footer in the shop layout; phone menu).
- Contact: the setting is `CONTACT_EMAIL`, in a config file beside the header code (it is not an API setting, so not in `lib/api/config/`). The same commit adds it to the README's `web/.env.local` step; `web/` has no `.env.example`.
- Risk: focus returning to the menu button when the sheet closes.
- Done when: journey at 400 px: open the menu, press Escape, see focus back on the menu button; the same header and footer show on the home, course and 404 pages.

## Step 7. Course page layout

```
Course page after 7
Desktop                                          Phone
+------------------------------------------+     +------------------+
| header                                   |     | header        ☰  |
| [ image 16:9, alt="" ]  | Price $99.00   |     | [ image 16:9 ]   |
| React Fundamentals (h1) | Schedule ...   |     | React Fund... h1 |
| summary                 | [Enroll ... →] |     | summary          |
| description, styled:    |  ^ sticky,     |     | Price / Schedule |
|  h2 · lists · quote ·   |    96px down   |     | [ Enroll ... → ] |
|  rule · links           |  (not yet a    |     | description ...  |
|  (columns 1–7)          |   panel; 9–12) |     |                  |
| footer                                   |     | footer           |
+------------------------------------------+     +------------------+
```

- Why here: the layout needs the header (6) and the form (2) to arrange.
- Needs: 2, 6.
- Size: 3 to 4 commits (image route; grid; description styles). Twins: [course-details.tsx](../web/src/features/courses/course-details.tsx), `.description-content` in globals.css (shared with the admin editor), courses.md *Course images*, item 5 (*Showing it*). Cards keep no image until the homepage redesign, so that item stays open for the card half.
- Risk: restyling `.description-content` changes the admin editor.
- Done when: journey: scroll the course page at 1280 px and see the panel stay 96px under the header; at 320 px a long name wraps; a slow image keeps its 16:9 box.

## Step 8. Buy panel looks

```
The buy panel after 8 (times still in today's format)
Upcoming, paid (1)      Free (2)             In progress (3)
+------------------+    +------------------+ +------------------------+
| STARTS DEC 1,2026|    | STARTS DEC 1,2026| | IN PROGRESS            |
| Dec 1, 6:00 PM – |    | Dec 1, 6:00 PM – | | Dec 1, 6:00 PM – ...   |
|  Dec 1, 8:00 PM  |    |  Dec 1, 8:00 PM  | | $99                    |
| $99              |    | Free             | | This course has        |
| [Enroll for $99→]|    | [Enroll for free→]| |  started. You can     |
| After you enroll.|    | After you enroll.| |  still enroll.         |
| You pay on       |    | We email you a   | | [Enroll for $99 →]     |
|  Stripe's ...    |    |  link ...        | | After you enroll. ...  |
+------------------+    +------------------+ +------------------------+
Ended (4)
+------------------------------+
| ( ENDED )                    |
| Dec 1, 2026                  |
| This course has ended.       |
| See current courses →  ghost |   <- no price, no fields
+------------------------------+
```

- Why here: the panel exists in the layout, so its states have a place.
- Needs: 7.
- Size: 3 to 4 commits. Twins: `formatPrice` (used by the card), the fixtures from step 2.
- Risk: changing `formatPrice` changes the card.
- Done when: journey: walk wireframe states 1, 2, 3 and 4 in `dev:mock` and see the screen drawn in the wireframe; the page shows no enrollment count.

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
- Size: 4 to 5 commits (locale from the request; course line and range on the server; visitor line; status line; shared length formatter). Twins: [course-schedule.tsx](../web/src/features/courses/course-schedule.tsx), [format-course-length.ts](../web/src/features/admin-courses/schedule/summary/format-course-length.ts), `temporal-polyfill`.
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
