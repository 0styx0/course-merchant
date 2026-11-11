import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { listCoursesHandlers } from "./handlers/courses/list-courses";
import { getCourseImageHandlers } from "./handlers/courses/get-course-image";
import { getCourseHandlers } from "./handlers/courses/get-course";
import {
  createCourseHandlers,
  makeRememberedCreateHandler,
} from "./handlers/admin-courses/create-course";
import {
  getCourseAsAdminHandlers,
  makeRememberedGetHandler,
} from "./handlers/admin-courses/get-course-as-admin";
import {
  makeRememberedUpdateHandler,
  makeTwoRoundsRefusalHandler,
  updateCourseHandlers,
} from "./handlers/admin-courses/update-course";
import {
  makeRememberedUploadHandler,
  uploadCourseImageHandlers,
} from "./handlers/admin-courses/upload-course-image";
import { getCourseImageAsAdminHandlers } from "./handlers/admin-courses/get-course-image-as-admin";
import { startCheckoutHandlers } from "./handlers/checkout/start-checkout";
import { getCheckoutStatusHandlers } from "./handlers/checkout/get-checkout-status";
import { makeRememberedCourse } from "./handlers/admin-courses/remembered-course";

const scenario = "success"; // change to the mock you want to test

// The four course endpoints share one store, so a saved course comes back as
// saved in the `remembered` scenario.
const rememberedCourse = makeRememberedCourse();

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

function scenarioHandler(
  handlers: Record<string, RequestHandler>,
): RequestHandler {
  if (scenario in handlers) {
    return handlers[scenario];
  }
  console.info(
    `[MSW Setup] An endpoint has no "${scenario}" scenario, so it serves "success".`,
  );
  return handlers.success;
}

if (
  !(scenario in listCoursesHandlers) &&
  !(scenario in getCourseHandlers) &&
  !(scenario in getCourseImageHandlers) &&
  !(scenario in createCourseScenarios) &&
  !(scenario in getCourseAsAdminScenarios) &&
  !(scenario in updateCourseScenarios) &&
  !(scenario in uploadCourseImageScenarios) &&
  !(scenario in getCourseImageAsAdminHandlers) &&
  !(scenario in startCheckoutHandlers) &&
  !(scenario in getCheckoutStatusHandlers)
) {
  throw new Error(
    `[MSW Setup] Unknown scenario "${scenario}". Pick one in src/mocks/server.ts`,
  );
}

export const server = setupServer(
  scenarioHandler(listCoursesHandlers),
  scenarioHandler(getCourseHandlers),
  scenarioHandler(getCourseImageHandlers),
  scenarioHandler(createCourseScenarios),
  scenarioHandler(getCourseAsAdminScenarios),
  scenarioHandler(updateCourseScenarios),
  scenarioHandler(uploadCourseImageScenarios),
  scenarioHandler(getCourseImageAsAdminHandlers),
  scenarioHandler(startCheckoutHandlers),
  scenarioHandler(getCheckoutStatusHandlers),
);
