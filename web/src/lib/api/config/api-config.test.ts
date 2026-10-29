import { afterEach, describe, expect, it, vi } from "vitest";

async function freshApiBaseUrl() {
  vi.resetModules();
  const { apiBaseUrl } = await import("./api-config");
  return apiBaseUrl;
}

describe("apiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured URL", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.example.com");
    const apiBaseUrl = await freshApiBaseUrl();

    expect(apiBaseUrl()).toBe("http://api.example.com");
  });

  it("remembers the URL it read first", async () => {
    vi.stubEnv("API_BASE_URL", "http://first.example.com");
    const apiBaseUrl = await freshApiBaseUrl();
    apiBaseUrl();

    vi.stubEnv("API_BASE_URL", "http://second.example.com");

    expect(apiBaseUrl()).toBe("http://first.example.com");
  });

  it("rejects an invalid URL", async () => {
    vi.stubEnv("API_BASE_URL", "nope");
    const apiBaseUrl = await freshApiBaseUrl();

    expect(() => apiBaseUrl()).toThrow("valid URL");
  });
});
