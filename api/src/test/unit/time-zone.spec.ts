import { expect, it } from "vitest";

it("runs in the time zone the test configuration sets", () => {
  expect(process.env.TZ).toBeDefined();
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ);
});
