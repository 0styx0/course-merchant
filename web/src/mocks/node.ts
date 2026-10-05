import { setupServer } from "msw/node";
import { coursesSuccess } from "./handlers/courses";

export const server = setupServer(coursesSuccess);