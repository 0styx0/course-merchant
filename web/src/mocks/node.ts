import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { listCoursesHandlers } from "./handlers/list-courses";
import { getCourseHandlers } from "./handlers/get-course";
import { createCourseHandlers } from "./handlers/create-course";

const scenario = "success"; // change to the mock you want to test

// An endpoint without the chosen scenario falls back to its success one.
function pick(handlers: Record<string, RequestHandler>): RequestHandler {
  return handlers[scenario] ?? handlers.success;
}

if (
  !(scenario in listCoursesHandlers) &&
  !(scenario in getCourseHandlers) &&
  !(scenario in createCourseHandlers)
) {
  throw new Error(
    `[MSW Setup] Unknown scenario "${scenario}". Pick one in src/mocks/node.ts`,
  );
}

export const server = setupServer(
  pick(listCoursesHandlers),
  pick(getCourseHandlers),
  pick(createCourseHandlers),
);
