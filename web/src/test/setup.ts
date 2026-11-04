import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { server } from "../mocks/node";
import { FROZEN_NOW } from "./frozen-now";

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
});
// Only Date is faked, so timers, user-event and findBy queries keep running in real time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
