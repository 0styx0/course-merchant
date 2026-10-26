const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Admin tokens travel to the API in an `Authorization` header, so in production
 * the API must be reached over HTTPS (or on the same machine).
 */
export function validateApiBaseUrl(
  value: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (!value) {
    throw new Error("API_BASE_URL is not configured");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API_BASE_URL is not a valid URL");
  }

  const isSecure =
    url.protocol === "https:" || LOOPBACK_HOSTS.has(url.hostname);
  if (nodeEnv === "production" && !isSecure) {
    throw new Error("API_BASE_URL must use https:// in production");
  }

  return value;
}
