import "server-only";

import createClient from "openapi-fetch";
import { API_TIMEOUT_MS, apiBaseUrl } from "./api-config";
import { fetchWithTimeout } from "./fetch-with-timeout";
import type { paths } from "./generated";

export const api = createClient<paths>({
  baseUrl: `${apiBaseUrl()}/v1/`,
  fetch: fetchWithTimeout(API_TIMEOUT_MS),
});
