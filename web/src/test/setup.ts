import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/node";

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error"
  });
})
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});