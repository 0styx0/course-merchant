import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/node";
import {
  startCheckoutNotPurchasable,
  startCheckoutSuccess,
  startCheckoutUrl,
} from "@/mocks/handlers/start-checkout";
import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "./start-checkout.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

// A short timeout lets the test see the abort without waiting 10 s.
vi.mock("@/lib/api/config/api-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/config/api-config")>()),
  API_TIMEOUT_MS: 50,
}));

const { redirect } = await import("next/navigation");

const courseId = "11111111-1111-4111-8111-111111111111";
const emptyState: StartCheckoutFormState = { state: "empty" };

function makeFormData(fields: Record<string, string | File>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

const typedForm = () =>
  makeFormData({
    "customer.name": "Ada Lovelace",
    "customer.email": "ada@example.com",
  });

beforeEach(() => vi.mocked(redirect).mockClear());

describe("startCheckoutAction", () => {
  it("returns success with the email for a check_email answer", async () => {
    server.use(startCheckoutSuccess);

    await expect(
      startCheckoutAction(courseId, emptyState, typedForm()),
    ).resolves.toEqual({
      state: "success",
      customer: { email: "ada@example.com" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to the API's url for a redirect answer", async () => {
    const url = "https://checkout.stripe.com/c/pay/cs_test_1";
    server.use(
      http.post(startCheckoutUrl, () =>
        HttpResponse.json({ status: "redirect", url }),
      ),
    );

    await startCheckoutAction(courseId, emptyState, typedForm());

    expect(redirect).toHaveBeenCalledExactlyOnceWith(url);
  });

  it("returns the problem with the typed values", async () => {
    server.use(startCheckoutNotPurchasable);

    await expect(
      startCheckoutAction(courseId, emptyState, typedForm()),
    ).resolves.toEqual({
      state: "failure",
      problem: {
        title: "Course not purchasable",
        detail: "This course has ended and can no longer be bought.",
        code: "COURSE_NOT_PURCHASABLE",
      },
      customer: { name: "Ada Lovelace", email: "ada@example.com" },
    });
  });

  it("sends a missing or file value as an empty string", async () => {
    let sentBody: unknown;
    server.use(
      http.post(startCheckoutUrl, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ status: "check_email" });
      }),
    );
    const formData = makeFormData({
      "customer.name": new File(["x"], "name.txt"),
    });

    await startCheckoutAction(courseId, emptyState, formData);

    expect(sentBody).toEqual({
      courseId,
      customer: { name: "", email: "" },
    });
  });

  it("throws when the API is unreachable", async () => {
    server.use(http.post(startCheckoutUrl, () => HttpResponse.error()));

    await expect(
      startCheckoutAction(courseId, emptyState, typedForm()),
    ).rejects.toThrow();
  });

  it("throws when the API answers past the timeout", async () => {
    server.use(
      http.post(startCheckoutUrl, async () => {
        await delay(500);
        return HttpResponse.json({ status: "check_email" });
      }),
    );

    await expect(
      startCheckoutAction(courseId, emptyState, typedForm()),
    ).rejects.toThrow();
  });
});
