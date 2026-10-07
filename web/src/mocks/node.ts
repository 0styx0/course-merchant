import { setupServer } from "msw/node";
import { coursesHandlers } from "./handlers/courses";

const scenario = "success"; // change to the mock you want to test
const handler =
  coursesHandlers[scenario as keyof typeof coursesHandlers];

if (!handler) {
  throw new Error(`[MSW Setup] Unknown MOCK_COURSES scenario: ${scenario}`);
}

export const server = setupServer(
  handler,
);
