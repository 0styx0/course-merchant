import "server-only";

import createClient from "openapi-fetch";
import type { paths } from "./generated";

const baseUrl = process.env.API_BASE_URL;

if (!baseUrl) {
  throw new Error("API_BASE_URL is not configured");
}

export const api = createClient<paths>({
  baseUrl: `${baseUrl}/v1`,
});