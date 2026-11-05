import { expect, it } from "vitest";

it("runs in the time zone the test configuration sets", () => {
  expect(process.env.TZ).toBeDefined();
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ);
});

it("runs in a zone that differs from UTC", () => {
  expect(new Date(2026, 0, 1).getTimezoneOffset()).not.toBe(0);
});
