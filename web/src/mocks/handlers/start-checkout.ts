import type { operations } from "@/lib/api/generated";
import { delay, http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type StartCheckoutSuccessResponse =
  operations["startCheckout"]["responses"][200]["content"]["application/json"];

type CourseNotPurchasableResponse =
  operations["startCheckout"]["responses"][409]["content"]["application/problem+json"];

export const startCheckoutUrl = `${MOCK_API_BASE_URL}/v1/checkout-sessions`;

const checkEmailBody = {
  status: "check_email",
} satisfies StartCheckoutSuccessResponse;

export const startCheckoutSuccess = http.post(startCheckoutUrl, () => {
  return HttpResponse.json(checkEmailBody);
});

const startCheckoutSlow = http.post(startCheckoutUrl, async () => {
  await delay(2000);
  return HttpResponse.json(checkEmailBody);
});

export const startCheckoutNotPurchasable = http.post(startCheckoutUrl, () => {
  const body = {
    title: "Course not purchasable",
    detail: "This course has ended and can no longer be bought.",
    code: "COURSE_NOT_PURCHASABLE",
  } satisfies CourseNotPurchasableResponse;

  return problemResponse(409, body);
});

export const startCheckoutHandlers = {
  success: startCheckoutSuccess,
  slow: startCheckoutSlow,
  notPurchasable: startCheckoutNotPurchasable,
};
