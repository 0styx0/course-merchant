import "server-only";

import createClient from "openapi-fetch";
import { validateApiBaseUrl } from "./base-url";
import type { paths } from "./generated";

const baseUrl = validateApiBaseUrl(
  process.env.API_BASE_URL,
  process.env.NODE_ENV,
);

export const api = createClient<paths>({
  baseUrl: `${baseUrl}/v1/`,
});
