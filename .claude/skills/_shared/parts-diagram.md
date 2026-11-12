# Parts diagram

Used by `/next-commit` (outline and hand-off) and whenever you propose a code change in chat. It explains what each new or changed part does and how the parts fit together, so the owner can follow the code before it exists. It complements the flow diagram ([flow-diagram.md](flow-diagram.md)), which shows what a user or request goes through, and the BEFORE/AFTER folder diagram ([output-format.md](output-format.md)), which shows where files move.

## When to draw it

- Draw it for every proposed change that adds or changes code.
- Skip it for doc-only commits and mechanical commits. A move keeps its BEFORE/AFTER diagram.

## How to draw it

- One code block per section, inside a message that follows CLAUDE.md *Writing*.
- Split the diagram into short independent sections. Head each with the question it answers, in capitals (`WHAT DRAWS THE CLOSED STATE`, `HOW useScrolledAboveHeader ANSWERS ITS QUESTION`), so the owner can read one and skip the rest.
- Open with the picture a visitor or developer sees: the states, or the screen before and after.
- Draw the parts as a tree with `├──` and `└──`. Each part gets:
  - its name,
  - its file in brackets,
  - one or two plain sentences on its job for the user or the developer.
- A bare name or a vague phrase ("hands off to", "wires up", "handles") is a defect. Say what the part does and what would go wrong without it.
- A hook, helper or observer says "Answers one question: …" or "Returns …" in plain words, then a sketch of how it works. A screen sketch beats prose for anything spatial.
- A part that appears only on a condition says so on its line (`← shown only when …`).
- Put mechanism notes after the picture, as a flat `How it does it:` list with one fact per line.
  - Define every browser or library API in one clause the first time it appears. Example: IntersectionObserver is the browser's way of reporting when an element crosses a line.
- When a part fixes a side effect, add a Without / With sketch side by side.
- Mark each part `NEW`, `CHANGED` or `existing`, as [flow-diagram.md](flow-diagram.md) does.
- Keep each line under about 80 characters.

## In the outline

- Draw the parts as planned, once per commit, after *What*. *What* lists the files and reused helpers; the diagram explains the jobs.

## In the hand-off

- Draw the parts as built, not as outlined.
- Mark any part that differs from the outline `CHANGED`, with the reason the *Deviations* line gives.

## Worked example

A phone buy bar: the enroll button has two states, and a bar repeats the button at the bottom of a phone once the visitor scrolls it away.

```
THE ENROLL BUTTON HAS TWO STATES
================================

  EnrollButton  (start-checkout/enroll-button.tsx)            CHANGED
  Shows everything a visitor uses to enroll in a course.

    State 1: CLOSED                         State 2: OPEN
    ┌────────────────────────┐   tap        ┌────────────────────────┐
    │   [ Enroll → ]         │ ──────────►  │  Name  [_________]     │
    │   note under button    │              │  Email [_________]     │
    └────────────────────────┘              │  [ Pay ]               │
                                            └────────────────────────┘
    Now drawn by ClosedEnrollButton.        existing


WHAT DRAWS THE CLOSED STATE
===========================

  ClosedEnrollButton  (closed-enroll-button.tsx)              NEW
  Draws the closed state and decides whether a phone also needs the bar.
  │
  ├── OpenFieldsButton  (open-fields-button.tsx)              NEW
  │     The "Enroll →" button itself. A tap opens the fields.
  │     It appears in two places, so both use this one file.
  │
  ├── note
  │     The text under the button.
  │
  ├── useScrolledAboveHeader  (use-scrolled-above-header.ts)  NEW
  │     Answers one question: "Has the visitor scrolled the Enroll
  │     button up under the header?"
  │
  └── PhoneBuyBar  (phone-buy-bar.tsx)                        NEW
        ← shown only when the answer is yes
        A strip pinned to the bottom of the screen with a second
        "Enroll →" button. Phones only, so a visitor who scrolled
        down to read the course can still enroll.


HOW useScrolledAboveHeader ANSWERS ITS QUESTION
===============================================

  ┌──────────────────────────┐
  │  site header (stays put) │
  ├──────────────────────────┤ ◄─ the hook watches this line
  │   course text…           │
  │   [ Enroll → ]           │    button below the line → NO
  └──────────────────────────┘

  After scrolling down:

  ┌──────────────────────────┐
  │  site header             │
  ├──────────────────────────┤ ◄─ button fully above the line → YES
  │   course text…           │
  ├──────────────────────────┤
  │ [      Enroll →       ]  │ ◄─ PhoneBuyBar appears
  └──────────────────────────┘

  How it does it:
  - IntersectionObserver (the browser's way of reporting when an element
    crosses a line) reports when the button crosses the line.
  - The hook finds the header through the data-site-header tag.
  - ResizeObserver (reports when an element changes size) moves the line
    when the header changes height.
  - The answer starts as NO, so server and browser render the same HTML.


STOPPING THE BAR FROM COVERING THE FOOTER  (globals.css)    CHANGED
========================================================

  Without:                             With:
  ┌────────────────────┐               ┌────────────────────┐
  │ footer links       │               │ footer links       │
  │ [ Enroll → ] bar   │ ← covers it   │ (empty room)       │
  └────────────────────┘               │ [ Enroll → ] bar   │
                                       └────────────────────┘
  How it does it:
  - The bar carries a data-phone-buy-bar tag; the CSS rule fires only
    while that tag is on the page.
  - The rule adds the bar's height (4.5rem) as room under the page.
  - Wider screens get no room, because the bar shows on phones only.
```
