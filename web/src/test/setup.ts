import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { server } from "../mocks/server";
import { FROZEN_NOW } from "./frozen-now";
import { spyTemporalNowOnDate } from "./spy-temporal-now-on-date";
import { installInertObservers } from "./stub-observers";

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

installInertObservers();

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
});
beforeEach(() => {
  // Only Date is faked, so timers, user-event and findBy queries keep running in real time.
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  spyTemporalNowOnDate();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
