# Style guide

How the public site and the admin look and sound. A developer or an AI follows these rules without seeing the original mockups, so each rule is a value, a token name or a do/don't pair.

Derived from two planned screenshots (the Courses page and the Free Gifts page) plus the owner's decisions of 2026-11-03. Values are observed in the screenshots, taken from the existing tokens, or marked **[proposed]** with a reason. Token names match `web/src/app/globals.css` exactly, so a grep finds them.

## Status

- [ ] Colour tokens, new tokens and the `--input` change in `globals.css` (one commit: it recolours the admin too). Light tokens done; the dark rows wait.
- [ ] Fonts self-hosted and the type scale registered.
- [ ] Public course page built from the wireframe.
- [ ] Homepage and course list built.

## 1. Principles

1. **Calm, not salesy.** The site shows no countdown timers, no "Only 2 seats left", no enrollment counts and no exclamation marks. It states scarcity as a fact or not at all.
2. **Photograph first, ornament never.** A section is an image plus words. The site uses no decorative icons, no decorative gradients and no illustrated flourishes.
3. **Flat, not floating.** Depth comes from the alternating band colours. Shadow marks layers that overlap content.
4. **One accent, one CTA per block.** Deep green is the only action colour. Gold marks the current location or a single CTA on dark. A block never uses both.
5. **Only a purchase asks for an email.** The site has no newsletter band, no modal and no exit-intent capture. The visitor gives an email once, at checkout. See [future-milestones.md](future-milestones.md) *Newsletter signup*.
6. **Generous, not dense — except in admin.** Admin may halve section spacing. Admin keeps the same type, colour and radius.

## 2. Colour

### Remapped tokens (light)

| Token | New value | Was | Role | Text allowed on it |
|---|---|---|---|---|
| `--background` | `oklch(0.977 0.011 95)` | `oklch(1 0 0)` | Page, header, footer | `--foreground`, `--muted-foreground` |
| `--primary` | `oklch(0.33 0.055 135)` | blue | All CTAs, play overlay | `--primary-foreground` |
| `--primary-foreground` | `oklch(0.977 0.011 95)` | — | Text on `--primary` | — |
| `--secondary` | `oklch(0.90 0.075 90)` | near-white | Gold: active nav pill | `--secondary-foreground` |
| `--secondary-foreground` | `oklch(0.153 0.006 107.1)` | grey | Text on gold | — |
| `--muted-foreground` | `oklch(0.53 0.028 107.3)` | `0.58 …` (3.99:1, failed) | Body, meta, captions | — |
| `--destructive` | `oklch(0.505 0.19 27.3)` | `0.577 …` (4.46:1, failed) | Error text, destructive fill | white |
| `--input` | `oklch(0.62 0.02 106.5)` | `0.64 …` (2.94:1 on `--surface-alt`, failed) | All field borders | — |
| `--ring` | `var(--primary)` | `0.55 0.03 106.5` | Focus ring on light surfaces | — |
| `--chart-1 … 5` | `0.33 0.055 135`, `0.45 0.06 128`, `0.58 0.07 112`, `0.74 0.08 98`, `0.90 0.075 90` | magenta ramp | Admin charts | see §10 chart rule |

### New tokens **[proposed]**

| Token | Value | Role | Reason |
|---|---|---|---|
| `--surface-alt` | `oklch(0.955 0.018 95)` | Every second content band | Observed banding; `--muted` is colder and lighter |
| `--surface-dark` | `oklch(0.26 0.03 140)` | CTA band, hero scrim | Darker than `--primary`; never a button fill |
| `--surface-dark-foreground` | `oklch(1 0 0)` | Text on `--surface-dark` | 15.40:1 |
| `--olive` | `oklch(0.52 0.07 112)` | Eyebrows and status lines on light surfaces only | No existing mid-olive token |
| `--success` | `oklch(0.47 0.09 150)` | Confirmation notices | No success token exists |
| `--success-foreground` | `oklch(1 0 0)` | Text on `--success` | — |

Register each with a `--color-*` alias in `@theme inline` (`--color-surface-alt: var(--surface-alt);`), so `bg-surface-alt` resolves.

### Dark theme (admin only; the public site ships light-only)

| Token | Value | Note |
|---|---|---|
| `--primary` | `oklch(0.6 0.08 135)` | Owner decision |
| `--primary-foreground` | `oklch(0.153 0.006 107.1)` | Owner decision; 5.11:1 |
| `--ring` | `var(--primary)` | 5.11:1 on `--background`, 4.42:1 on `--card` |
| `--input` | `oklch(0.58 0.02 106.5)` **[changed]** | `oklch(1 0 0 / 15%)` composites to 1.49:1, below the 3:1 floor |
| `--border` | `oklch(1 0 0 / 10%)` | Unchanged: 1.26:1, decorative dividers only. A border that separates controls uses `--input` |
| `--foreground`, `--muted-foreground`, `--card`, `--accent`, `--destructive`, `--secondary` | unchanged | Pairs listed in §11 pass |

### Unchanged light tokens

| Token | Use |
|---|---|
| `--foreground` `oklch(0.153 0.006 107.1)` | Headings, nav links, input text |
| `--card` `oklch(1 0 0)` | Inputs and popovers only: the one place white appears |
| `--border` `oklch(0.93 0.007 106.5)` | Decorative dividers only (1.15:1, never load-bearing) |
| `--accent` / `--accent-foreground` | Ghost-button and menu hover surface |

### States

| State | Rule |
|---|---|
| Hover (primary) | `oklch(0.38 0.06 135)` |
| Hover (gold) | `oklch(0.86 0.08 90)` |
| Hover (ghost) | `bg-accent` |
| Pressed | Darken 0.04 L; no translate, no scale |
| Disabled | `opacity: 0.5; pointer-events: none`. Exempt from contrast |
| Focus (light surfaces) | `ring-2 ring-ring ring-offset-2 ring-offset-background` |
| Focus (on `--surface-dark`) | `ring-2 ring-secondary ring-offset-2 ring-offset-surface-dark` (11.43:1) |
| Error | Text `--destructive`; border `--destructive` at 1px; always with a message |
| Success | Icon and border `--success`; body text stays `--foreground` |

## 3. Typography

```css
--font-heading: "Playfair Display", "Iowan Old Style", Georgia, "Times New Roman", serif;
--font-sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
```

Both families are identified by eye from the screenshots. Self-host both as `woff2` with `font-display: swap`. Headings use weight 400 only.

| Name | Size | Weight | Line height | Tracking | Class | Family |
|---|---|---|---|---|---|---|
| display | 3.5rem | 400 | 1.05 | -0.01em | `text-display` | heading |
| h1 | 2.75rem | 400 | 1.1 | -0.01em | `text-h1` | heading |
| h2 | 2.25rem | 400 | 1.15 | 0 | `text-h2` | heading |
| h3 | 1.5rem | 400 | 1.25 | 0 | `text-h3` | heading |
| body-lg | 1.125rem | 400 | 1.55 | 0 | `text-body-lg` | sans |
| body | 1rem | 400 | 1.6 | 0 | `text-body` | sans |
| meta | 0.9375rem | 400 | 1.5 | 0 | `text-meta` | sans |
| small | 0.8125rem | 400 | 1.45 | 0 | `text-small` | sans |
| eyebrow | 0.75rem | 600 | 1.4 | 0.12em | `text-eyebrow uppercase` | sans |

| Element | Step | Colour |
|---|---|---|
| Hero title | display (mobile: h1) | `--surface-dark-foreground` |
| Hero subtitle | body-lg | `--surface-dark-foreground` |
| Section / course title | h2 | `--foreground` |
| Card title | h3 | `--foreground` |
| Body, description | body-lg (admin: body) | `--muted-foreground` |
| Price | h3, `font-sans`, weight 500, `tabular-nums` | `--foreground` |
| Meta, captions | meta / small | `--muted-foreground` |
| Eyebrow, status line | eyebrow | `--olive` |
| Button label | body, weight 500 | per variant |
| Nav link | meta, weight 500 (current page: 600) | `--foreground` |

Below `md`: display becomes `text-h1`, h1 becomes `text-h2`, h2 becomes `text-h3`. Body steps never shrink.

## 4. Spacing and layout

- **Unit: 4px.** Use multiples of 4; use 2px for borders and ring offsets only.
- **Page max width:** `1200px`. **Centred prose column:** `680px`.
- **Gutters:** 16px phone (<640), 32px tablet (640–1023), 48px desktop (≥1024).
- **Grid:** 12 columns, 24px gap. A split row is image `col-span-6`, gap `col-span-1`, text `col-span-5`. It stacks below `md` with a 24px gap.

| Gap | Value |
|---|---|
| Between full-width sections | 0 (bands butt together) |
| Section inner padding | 96 / 64 / 48px (desktop / tablet / phone) |
| Hero height | 420 / 320 / 280px |
| Header height | 72px |
| Eyebrow → title | 12px |
| Title → description | 16px |
| Description → meta | 20px |
| Meta → price | 16px |
| Price → button | 20px |
| Label → input | 8px |
| Input → error text | 6px |
| Field → next field | 20px |

## 5. Shape and depth

| Component | Radius |
|---|---|
| Button, input, select, textarea | `rounded-md` (8px) |
| Card, dialog, alert | `rounded-lg` (10px) |
| Nav pill, badge, status pill, play overlay | `rounded-full` |
| Images, hero, bands | `rounded-none` |

- **Borders:** 1px only. `--border` marks decorative dividers. `--input` marks form controls. `--primary` marks the current-page pill. `--destructive` marks invalid controls.
- **Shadows** **[proposed]** (the screenshots are flat):

| Level | Value | Use |
|---|---|---|
| none | — | Buttons, cards, bands, inputs |
| `shadow-sm` | `0 1px 2px oklch(0.153 0.006 107.1 / 0.06)` | Header once scrolled |
| `shadow-md` | `0 8px 24px oklch(0.153 0.006 107.1 / 0.12)` | Popover, dropdown, dialog |

## 6. Imagery

- **Ratios:** `3:2` for course and event imagery; `16:9` for video and audio media; `1:1` for avatars.
- **Crop:** `object-cover object-center`. Images carry no baked-in text.
- **Hero scrim (required).** Wherever hero text overlaps the photo, the combined scrim must reach an effective opacity of 0.65 of `--surface-dark`. White text on a pure-white photo then reaches 4.89:1; the exact floor for 4.5:1 is 0.624. Build it as a flat 40% layer plus a gradient to 75% on the text side (effective 0.85, 9.55:1). Text never extends past the gradient: the flat layer alone gives 2.11:1.
- **Play overlay:** 56px circle (44px below `md`), `bg-primary`, white triangle.
- **Missing image:** `bg-surface-alt` at the correct ratio with `NO IMAGE` centred in eyebrow type, `--muted-foreground`. The site shows no broken-image icon and no silent substitute.
- **Alt text:** describe the subject in ≤125 characters, with no "image of". Course images name the course. A photo that repeats adjacent copy takes `alt=""`.

## 7. Components

### Button (shadcn `Button`)

A label (body, weight 500) plus an optional trailing `→` (16px, 8px gap, `aria-hidden`). Icons trail only. Sizes: `sm` 36px `px-4`, `default` 48px `px-6`, `lg` 56px `px-8`. Set `min-width: 11rem`, and `w-full` below `sm`. §9 rule 1 fixes the wording.

| Variant | Fill | Text | Use |
|---|---|---|---|
| primary | `--primary` | `--primary-foreground` | One per block |
| secondary | `--secondary` | `--secondary-foreground` | CTA on `--surface-dark` only |
| ghost | transparent | `--foreground` | Nav, back, "See current courses" |
| destructive | `--destructive` | `oklch(1 0 0)` | Admin delete, inside a confirm dialog only |

Loading: the label swaps to the §9 loading string, a spinner replaces the arrow, `aria-busy="true"` is set and the width holds.

### Input, label and error (shadcn `Input`, `Label`)

A visible `Label` (meta, weight 500, `--foreground`), then the `Input` (48px, `rounded-md`, `bg-card`, `border-input`, body, 16px padding), then a hint (small, `--muted-foreground`) or an error (small, `--destructive`).

- Placeholders are examples, never labels. Every field has a visible label.
- An error sets `aria-invalid="true"` and `aria-describedby` on the message. Colour never carries an error alone.
- The public site has no inputs on dark surfaces. Admin dark mode uses the dark `--input` for borders.

### Course card (shadcn `Card`)

Image (3:2), eyebrow (`NN / FORMAT`), title (h3), description (body, clamp 3), meta row (`4 weeks · Live on Zoom`), price (`$99` or `Free`), primary button. The card and its meta line never show an enrollment count.

The card uses `rounded-lg`, `bg-card`, `border-border`, no shadow and 24px padding. The grid has 3 / 2 / 1 columns with a 24px gap. The whole card is one link, and the button inside it gets `tabIndex={-1}`. The split row on the Courses page holds the same content at a different density.

### Badge and status pill (shadcn `Badge`)

`rounded-full px-3 py-1`, eyebrow type. A status always shows its word.

| Status | Fill | Text |
|---|---|---|
| Free | `--secondary` | `--secondary-foreground` |
| Live / Online | `--surface-alt` | `--olive` |
| Ended, Sold out, Draft | `--muted` | `--muted-foreground` |
| Published (admin) | `--success` | `--success-foreground` |

### Alert and notice (shadcn `Alert`)

`rounded-lg`, 1px border, 16px padding, 12px gap. A title (body, weight 500, `--foreground`) and a message (body, `--muted-foreground`).

| Kind | Border | Icon |
|---|---|---|
| info | `--border` | none |
| success | `--success` | check, `--success` |
| error | `--destructive` | alert-circle, `--destructive` |

Errors appear inline above the form they concern, never as a floating toast.

### Nav header

72px tall, `bg-background`, `sticky top-0`, `shadow-sm` after 8px of scroll. The wordmark sits left (h3, heading font). Links sit right (meta, weight 500, 32px gap).

The current page carries four signals, and none of them is colour alone: a `rounded-full bg-secondary px-4 py-2` fill, label weight 600, a `1px solid var(--primary)` border (8.90:1 against the gold, 11.23:1 against the page) and `aria-current="page"`.

Below `md`, the header shows the wordmark and a hamburger, and the links move into a full-height sheet with 48px rows.

### Footer

`bg-background`, a 1px `--border` top, 48px vertical padding. The wordmark sits left (h3). Links sit right (meta, `--muted-foreground`, hover `--foreground`, 24px gap). Below `md` the footer stacks and left-aligns.

### CTA band

`bg-surface-dark`, a centred stack, 96px vertical padding: a heading (h2, `--surface-dark-foreground`), an optional one-line subtext (body-lg) and one secondary button. The band has no input, no email capture and no second action.

## 8. Formats

Render dates and times with `Intl.DateTimeFormat` in the visitor's locale, never a hand-built string. Always display the time zone name.

| Thing | Rule | Example (en-US) |
|---|---|---|
| Price, paid | `$` + amount, no decimals when whole, no currency code | `$99`, `$49.50` |
| Price, free | The word | `Free` |
| Currency | USD only. Never print a currency code | — |
| Date | `Intl` `{ dateStyle: 'medium' }` | `Mar 12, 2026` |
| Date with weekday | `{ weekday:'short', month:'short', day:'numeric' }` | `Thu, Mar 12` |
| Time | `{ timeStyle:'short', timeZoneName:'short' }`; the locale picks 12h or 24h | `7:00 PM EST` |
| Course time | The course's own zone first; the visitor's local time follows **only when the zone differs** | `7:00 PM EST (4:00 PM PST your time)` |
| Date range | `Intl.DateTimeFormat.formatRange` | `Mar 12 – 26, 2026` |
| Duration | Number + unit word | `4 weeks`, `90 min`, `6 sessions · 90 min each` |
| Relative time | `Intl.RelativeTimeFormat` within 14 days, absolute beyond | `Starts in 4 days`, `Starts tomorrow`, `Starts Mar 12, 2026` |
| Unknown date | Uppercase status line, never a guess | `NEXT DATE TO BE ANNOUNCED` |
| Ended course | Status line, no date maths | `This course has ended.` |
| Meta separator | Middle dot with spaces | `4 weeks · Live on Zoom` |
| Numbers in admin tables | `tabular-nums`, right-aligned | — |

The public never sees an enrollment count, in any format. Admin shows it.

## 9. Voice and copy

**1. Button wording is fixed. Use exactly these strings.**

| Context | String |
|---|---|
| Course list, cards | `Explore course →` |
| Paid course page | `Enroll for $99 →` (the actual price) |
| Free course page | `Enroll for free →` |
| Paid form submit | `Continue to payment →` |
| Free form submit | `Email me the link →` |
| Loading (paid) | `Opening payment…` |
| Loading (free) | `Sending…` |
| Payment failure | `Try again →` |
| After "check your email" | *no button* |
| Ended course | *no buy button*; the line `This course has ended.` plus a ghost `See current courses →` |

Banned: `Buy now`, `Purchase`, `Checkout`, `Submit`, `Register`.

A buyer who already owns a paid course clicks `Continue to payment →` and sees "check your email" instead of Stripe. The API does this on purpose, so the site never reveals who owns what.

2. **Headings are a short sentence with a full stop.**
   Do: `Practice presence, your way.` Don't: `Transform Your Life In 4 Weeks`.
3. **Descriptions are one sentence saying what happens.**
   Do: `A four-week exploration of mind, body, speech, and connection.`
   Don't: `The only course you'll ever need.`
4. **No urgency, no superlatives, no exclamation marks, no social proof by number.**
   Do: `NEXT DATE TO BE ANNOUNCED`. Don't: `Doors close Friday!`, `Join 400+ students`.
5. **Sentence case everywhere** except eyebrows and status lines, which are uppercase with tracking (`01 / LIVE ONLINE`, `— FREE EBOOK —`).
6. **State limits next to the thing they limit.**
   Do: `Course concepts shown for preview.` Don't: bury it in the footer.
7. **Errors say what happened, then what to do.**
   Do: `We couldn't take that payment. Check the card details and try again.`
   Do: `That email address looks incomplete. It should include an @.`
   Don't: `Error 402`, `Invalid input`, `Something went wrong`.
8. **Empty states describe the state and offer one action.**
   Do: `No courses yet. New ones are announced here.` + ghost `See current courses →`.
   Don't: `Oops! Nothing here 🤷`.
9. **The confirmation names the inbox and the fallback, and ends the flow.**
   Do: `Check your email — we've sent access to ami@example.com. It can take a few minutes. If it hasn't arrived, look in spam or contact us.`
   Don't: `Success!` alone, or any button beneath it.
10. **Second person for the visitor, first person plural for the site.**
    Do: `A little space to pause, reconnect, and be here.`
    Don't: `Users may purchase access to courses.`

## 10. Accessibility floors

- **Text:** 4.5:1 (3:1 for text ≥24px, or ≥18.66px bold). §11 lists the computed pairs.
- **Field borders and focus rings:** 3:1 against every surface they sit on. `--input` clears 3:1 on `--card`, `--background` and `--surface-alt`. Controls never sit on `--surface-dark` on the public site, and focus rings there use `--secondary` (11.43:1).
- **Focus:** `ring-2 ring-ring ring-offset-2`. Never `outline: none` without a replacement, and never `:focus-visible`-only on form controls.
- **Current page:** four signals (gold fill, weight 600, a `--primary` border and `aria-current`). The gold fill alone gives 1.26:1.
- **Charts:** `--chart-4` (2.15:1) and `--chart-5` (1.26:1) miss 3:1 against `--background` as fills. Every series therefore carries a 1px `--input` stroke (3.40:1) and a direct label. Hue never identifies a series alone.
- **Touch targets:** 44×44px minimum, at least 8px apart. This covers nav links, footer links and the play overlay.
- **Motion:** ≤200ms, `ease-out`, opacity and colour only. No parallax, no autoplay with sound. Wrap all of it in `@media (prefers-reduced-motion: reduce)`.
- **Structure:** one `h1` per page (the hero title). Bands use `h2`; card titles use `h3`.
- **Zoom:** the layout survives 200% zoom and a 320px viewport with no horizontal scroll.

## 11. Contrast check (computed)

Method: each oklch value converts to linear sRGB, then to relative luminance (WCAG 2.1), and the ratio is `(L1+0.05)/(L2+0.05)`. Transparent layers blend in encoded sRGB, as browsers do. Two caveats: the screenshot colours are read by eye, and the scrim figures assume a pure-white photo as the worst case.

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| `--foreground` on `--background` / `--surface-alt` / `--card` | 18.34 / 17.20 / 19.59 | 4.5 | pass |
| `--muted-foreground` on `--background` / `--surface-alt` | 4.92 / 4.61 | 4.5 | pass |
| `--olive` on `--background` / `--surface-alt` | 5.09 / 4.77 | 4.5 | pass |
| `--primary-foreground` on `--primary` / primary hover | 11.23 / 9.17 | 4.5 | pass |
| `--secondary-foreground` on `--secondary` / gold hover | 14.54 / 12.81 | 4.5 | pass |
| `--surface-dark-foreground` on `--surface-dark` | 15.40 | 4.5 | pass |
| `--destructive` on `--background` / `--surface-alt` | 6.07 / 5.69 | 4.5 | pass |
| white on `--destructive` / `--success` | 6.48 / 6.54 | 4.5 | pass |
| white on scrim at 0.85 / 0.65 effective opacity | 9.55 / 4.89 | 4.5 | pass |
| white on scrim, flat 0.35 layer only | 2.11 | 4.5 | **fail**: text stays inside the gradient |
| `--input` on `--card` / `--background` / `--surface-alt` | 3.63 / 3.40 / 3.19 | 3 | pass |
| `--input` 0.64 (old) on `--surface-alt` | 2.94 | 3 | **fail**: replaced |
| `--ring` (= `--primary`) on `--background` | 11.23 | 3 | pass |
| `--secondary` ring on `--surface-dark` | 11.43 | 3 | pass |
| `--primary` pill border on `--secondary` / `--background` | 8.90 / 11.23 | 3 | pass |
| `--input` as pill border on `--secondary` | 2.69 | 3 | **fail**: `--primary` used instead |
| `--chart-1` / `-2` / `-3` on `--background` | 11.23 / 6.83 / 3.96 | 3 | pass |
| `--chart-4` / `-5` on `--background` | 2.15 / 1.26 | 3 | **fail**: stroke and label required |
| `--border` on `--background` | 1.15 | 3 | decorative only |
| `--secondary` fill on `--background` | 1.26 | 3 | never the sole signal |
| Dark `--muted-foreground` on `--background` / `--card` | 8.43 / 7.30 | 4.5 | pass |
| Dark `--primary-foreground` on `--primary` | 5.11 | 4.5 | pass |
| Dark `--primary` (ring) on `--background` / `--card` / `--accent` | 5.11 / 4.42 / 3.72 | 3 | pass |
| Dark `--destructive` on `--background` | 6.77 | 4.5 | pass |
| Dark `--input` 0.58 on `--background` / `--card` / `--accent` | 4.59 / 3.97 / 3.34 | 3 | pass |
| Dark `--input` 15% white (old) on `--background` | 1.49 | 3 | **fail**: replaced |
| Dark `--border` on `--background` | 1.26 | 3 | decorative only |

## 12. Open questions, with the default in force until answered

| # | Question | Default |
|---|---|---|
| 1 | Where does price sit on a course card? Neither screenshot shows one. | Between meta and button: h3, weight 500, `tabular-nums`. `Free` takes the same slot. |
| 2 | Does a homepage exist, and does it reuse the course rows? | Yes: hero, three course rows and a CTA band, built from the same components. |
| 3 | Checkout layout (name and email, no login). | Centred 680px column. The order summary sits above the fields on mobile and beside them on desktop. Two fields, then `Continue to payment →`. |
| 4 | Confirmation page. | Centred column, `--success` alert, the email address echoed, a resend link after 60s, no button. |
| 5 | Empty states: no courses, no gifts, course ended. | A band with a placeholder ratio box, h3, one sentence and a ghost `See current courses →`. |
| 6 | Does a free item need the same two fields as a paid one? | The API needs a name and an email for both, so the free form asks for both. Only the button wording differs. |
| 7 | Admin density and dark default. | Same tokens; section padding 48px, body drops to `text-body`, cards gain `border-border`. Dark mode follows the OS preference. |
| 8 | In-person course location display. | Meta line `Mar 12 · Lisbon · In person`. The API has no location field today, so this waits for one. |
| 9 | Favicon, OG image, transactional email template. | Wordmark on `--background`; OG image is the hero crop at 1200×630 with the scrim; email uses `--font-sans` only, because serif webfonts are unreliable in mail clients. |
| 10 | Refund and contact policy text. | Linked from the footer `Contact`; not shown inline on course pages. |
