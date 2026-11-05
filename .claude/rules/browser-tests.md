---
paths:
  - "web/tests/browser/**"
---

# Browser tests

Each browser test adds seconds to every push, so browser tests stay a small share of the web tests and never repeat what a unit test proves.

- Write a browser test only for something jsdom can't show: Next's routing (an unmatched URL, a redirect, a 404 status), a CSS breakpoint or layout, focus after a real navigation, cookies, the back-forward cache.
- Write one test for each such thing. Unit tests carry the cases (each page, each failure, each label).
- Loop over pages, tokens or states only when each one can fail on its own; otherwise check one example.
- Before adding a test, say in its title or a comment what a unit test couldn't show.
