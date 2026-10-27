import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { courseListHandlers } from "./handlers/courses.list";
import { courseByIdHandlers } from "./handlers/course.get";

const scenario = "success"; // change to the mock you want to test

// An endpoint without the chosen scenario falls back to its success one.
function pick(handlers: Record<string, RequestHandler>): RequestHandler {
  return handlers[scenario] ?? handlers.success;
}

if (!(scenario in courseListHandlers) && !(scenario in courseByIdHandlers)) {
  throw new Error(
    `[MSW Setup] Unknown scenario "${scenario}". Pick one in src/mocks/node.ts`,
  );
}

export const server = setupServer(
  pick(courseListHandlers),
  pick(courseByIdHandlers),
);
