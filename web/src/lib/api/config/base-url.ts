const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isSecure(url: URL): boolean {
  return url.protocol === "https:" || LOOPBACK_HOSTS.has(url.hostname);
}

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

  const url = parseUrl(value);
  if (!url) {
    throw new Error("API_BASE_URL is not a valid URL");
  }

  if (nodeEnv === "production" && !isSecure(url)) {
    throw new Error("API_BASE_URL must use https:// in production");
  }

  return value;
}
