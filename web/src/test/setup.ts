import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/node";

import "@testing-library/jest-dom/vitest";

beforeAll(() => {
  server.listen({
    onUnhandledFrame: "error",
  });
})
afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});