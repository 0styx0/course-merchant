import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/node";
import { MOCK_API_BASE_URL } from "@/mocks/mock-api";
import { fetchWithTimeout } from "./fetch-with-timeout";

const url = `${MOCK_API_BASE_URL}/timeout-test`;

describe("fetchWithTimeout", () => {
  it("returns a response that arrives in time", async () => {
    server.use(http.get(url, () => HttpResponse.json({ ok: true })));

    const response = await fetchWithTimeout(1000)(new Request(url));

    expect(await response.json()).toEqual({ ok: true });
  });

  it("aborts a call that takes too long", async () => {
    server.use(
      http.get(url, async () => {
        await delay("infinite");
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(fetchWithTimeout(20)(new Request(url))).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });

  it("gives each call its own time limit", async () => {
    server.use(
      http.get(url, async () => {
        await delay(30);
        return HttpResponse.json({ ok: true });
      }),
    );
    const timedFetch = fetchWithTimeout(50);

    await timedFetch(new Request(url));
    const second = await timedFetch(new Request(url));

    expect(second.ok).toBe(true);
  });
});
