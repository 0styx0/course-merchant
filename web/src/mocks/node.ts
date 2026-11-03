import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { listCoursesHandlers } from "./handlers/list-courses";
import { getCourseHandlers } from "./handlers/get-course";
import {
  createCourseHandlers,
  makeRememberedCreateHandler,
} from "./handlers/create-course";
import {
  getCourseAsAdminHandlers,
  makeRememberedGetHandler,
} from "./handlers/get-course-as-admin";
import {
  makeRememberedUpdateHandler,
  makeTwoRoundsRefusalHandler,
  updateCourseHandlers,
} from "./handlers/update-course";
import {
  makeRememberedUploadHandler,
  uploadCourseImageHandlers,
} from "./handlers/upload-course-image";
import { getCourseImageAsAdminHandlers } from "./handlers/get-course-image-as-admin";
import { makeRememberedCourse } from "./remembered-course";

const scenario = "success"; // change to the mock you want to test

// The four course endpoints share one store, so a saved course comes back as
// saved in the `remembered` scenario.
const rememberedCourse = makeRememberedCourse();

// Only the update endpoint has `twoRounds`, so the rest use their success one.
const updateCourseScenarios = {
  ...updateCourseHandlers,
  twoRounds: makeTwoRoundsRefusalHandler(),
  remembered: makeRememberedUpdateHandler(rememberedCourse),
};

const createCourseScenarios = {
  ...createCourseHandlers,
  remembered: makeRememberedCreateHandler(rememberedCourse),
};
const getCourseAsAdminScenarios = {
  ...getCourseAsAdminHandlers,
  remembered: makeRememberedGetHandler(rememberedCourse),
};
const uploadCourseImageScenarios = {
  ...uploadCourseImageHandlers,
  remembered: makeRememberedUploadHandler(rememberedCourse),
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
  !(scenario in createCourseScenarios) &&
  !(scenario in getCourseAsAdminScenarios) &&
  !(scenario in updateCourseScenarios) &&
  !(scenario in uploadCourseImageScenarios) &&
  !(scenario in getCourseImageAsAdminHandlers)
) {
  throw new Error(
    `[MSW Setup] Unknown scenario "${scenario}". Pick one in src/mocks/node.ts`,
  );
}

export const server = setupServer(
  scenarioHandler(listCoursesHandlers),
  scenarioHandler(getCourseHandlers),
  scenarioHandler(createCourseScenarios),
  scenarioHandler(getCourseAsAdminScenarios),
  scenarioHandler(updateCourseScenarios),
  scenarioHandler(uploadCourseImageScenarios),
  scenarioHandler(getCourseImageAsAdminHandlers),
);
