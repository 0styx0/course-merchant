import type { operations } from "@/lib/api/generated";
import { delay, http, HttpResponse } from "msw";
import {
  CHECKOUT_EMAIL_INCOMPLETE_MESSAGE,
  CHECKOUT_NAME_MISSING_MESSAGE,
} from "@/features/checkout/form/checkout-messages";
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

type CheckoutValidationResponse =
  operations["startCheckout"]["responses"][400]["content"]["application/problem+json"];

function checkoutValidationResponse(
  errors: CheckoutValidationResponse["errors"],
) {
  const body = {
    title: "Validation failed",
    detail: `The request contains ${errors.length} invalid field${errors.length === 1 ? "" : "s"}.`,
    code: "VALIDATION_FAILED",
    errors,
  } satisfies CheckoutValidationResponse;

  return problemResponse(400, body);
}

export const startCheckoutNameInvalid = http.post(startCheckoutUrl, () =>
  checkoutValidationResponse([
    {
      field: "/customer/name",
      code: "TOO_SHORT",
      detail: CHECKOUT_NAME_MISSING_MESSAGE,
    },
  ]),
);

export const startCheckoutEmailInvalid = http.post(startCheckoutUrl, () =>
  checkoutValidationResponse([
    {
      field: "/customer/email",
      code: "INVALID_FORMAT",
      detail: CHECKOUT_EMAIL_INCOMPLETE_MESSAGE,
    },
  ]),
);

export const startCheckoutHandlers = {
  success: startCheckoutSuccess,
  slow: startCheckoutSlow,
  notPurchasable: startCheckoutNotPurchasable,
  nameInvalid: startCheckoutNameInvalid,
  emailInvalid: startCheckoutEmailInvalid,
};
