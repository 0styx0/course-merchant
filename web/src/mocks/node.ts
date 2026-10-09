import { setupServer } from "msw/node";
import { courseListHandlers } from "./handlers/courses.list";
import { courseByIdHandlers } from "./handlers/course.get";

const scenario = "success"; // change to the mock you want to test
const courseListHandler =
  courseListHandlers[scenario as keyof typeof courseListHandlers];
const courseByIdHandler =
  courseByIdHandlers[scenario as keyof typeof courseByIdHandlers];

if (!courseListHandler) {
  throw new Error(`[MSW Setup] Unknown MOCK_COURSES scenario: ${scenario}`);
}

export const server = setupServer(
  courseListHandler,
  courseByIdHandler
);
