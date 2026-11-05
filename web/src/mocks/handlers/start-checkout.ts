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

export const startCheckoutCheckEmail = http.post(startCheckoutUrl, () => {
  return HttpResponse.json(checkEmailBody);
});

const redirectBody = {
  status: "redirect",
  url: "http://pay.localhost:3000/checkout/success?checkoutId=cs_test_mock",
} satisfies StartCheckoutSuccessResponse;

// The pause lets a test see "Opening payment…" before the browser leaves.
const startCheckoutRedirect = http.post(startCheckoutUrl, async () => {
  await delay(500);
  return HttpResponse.json(redirectBody);
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

export const startCheckoutUnreachable = http.post(startCheckoutUrl, () =>
  HttpResponse.error(),
);

type PaymentProviderDownResponse =
  operations["startCheckout"]["responses"][503]["content"]["application/problem+json"];

const startCheckoutPaymentProviderDown = http.post(startCheckoutUrl, () => {
  const body = {
    title: "Payment provider unavailable",
    detail: "Payments can't be taken right now. Try again later.",
    code: "PAYMENT_PROVIDER_UNAVAILABLE",
  } satisfies PaymentProviderDownResponse;

  return problemResponse(503, body);
});

export const startCheckoutHandlers = {
  // `success` is the name `dev:mock` falls back to for every endpoint.
  success: startCheckoutCheckEmail,
  checkEmail: startCheckoutCheckEmail,
  redirect: startCheckoutRedirect,
  slow: startCheckoutSlow,
  notPurchasable: startCheckoutNotPurchasable,
  nameInvalid: startCheckoutNameInvalid,
  emailInvalid: startCheckoutEmailInvalid,
  unreachable: startCheckoutUnreachable,
  paymentProviderDown: startCheckoutPaymentProviderDown,
};
