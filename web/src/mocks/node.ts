import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { listCoursesHandlers } from "./handlers/list-courses";
import { getCourseHandlers } from "./handlers/get-course";
import { createCourseHandlers } from "./handlers/create-course";
import { getCourseAsAdminHandlers } from "./handlers/get-course-as-admin";
import {
  makeTwoRoundsRefusalHandler,
  updateCourseHandlers,
} from "./handlers/update-course";
import { uploadCourseImageHandlers } from "./handlers/upload-course-image";

const scenario = "success"; // change to the mock you want to test

// Only the update endpoint has this scenario, so the rest use their success one.
const updateCourseScenarios = {
  ...updateCourseHandlers,
  twoRounds: makeTwoRoundsRefusalHandler(),
};

// An endpoint without the chosen scenario falls back to its success one.
function scenarioHandler(
  handlers: Record<string, RequestHandler>,
): RequestHandler {
  return handlers[scenario] ?? handlers.success;
}

if (
  !(scenario in listCoursesHandlers) &&
  !(scenario in getCourseHandlers) &&
  !(scenario in createCourseHandlers) &&
  !(scenario in getCourseAsAdminHandlers) &&
  !(scenario in updateCourseScenarios) &&
  !(scenario in uploadCourseImageHandlers)
) {
  throw new Error(
    `[MSW Setup] Unknown scenario "${scenario}". Pick one in src/mocks/node.ts`,
  );
}

export const server = setupServer(
  scenarioHandler(listCoursesHandlers),
  scenarioHandler(getCourseHandlers),
  scenarioHandler(createCourseHandlers),
  scenarioHandler(getCourseAsAdminHandlers),
  scenarioHandler(updateCourseScenarios),
  scenarioHandler(uploadCourseImageHandlers),
);
