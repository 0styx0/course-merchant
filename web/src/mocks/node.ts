import { setupServer } from "msw/node";
import { coursesHandlers, coursesMockControl } from "./handlers/courses";

const scenario = process.env.MOCK_COURSES ?? "success";

const handler =
  coursesHandlers[scenario as keyof typeof coursesHandlers];

if (!handler) {
  throw new Error(`[MSW Setup] Unknown MOCK_COURSES scenario: ${scenario}`);
}


export const server = setupServer(
  handler,
);
server.use(coursesMockControl(server))
