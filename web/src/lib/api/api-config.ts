import { validateApiBaseUrl } from "./base-url";

/** How long one API call may take before it is aborted. */
export const API_TIMEOUT_MS = 10_000;

let baseUrl: string | undefined;

/**
 * Reads and checks `API_BASE_URL` on first use, then remembers it.
 * `instrumentation-node.ts` calls it at boot so a bad setting stops the server.
 */
export function apiBaseUrl(): string {
  baseUrl ??= validateApiBaseUrl(
    process.env.API_BASE_URL,
    process.env.NODE_ENV,
  );
  return baseUrl;
}
