import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type CheckoutStatusResponse =
  operations["getCheckoutStatus"]["responses"][200]["content"]["application/json"];

type CheckoutNotFoundResponse =
  operations["getCheckoutStatus"]["responses"][404]["content"]["application/problem+json"];

type CheckoutServerErrorResponse =
  operations["getCheckoutStatus"]["responses"][500]["content"]["application/problem+json"];

export const checkoutStatusUrl = `${MOCK_API_BASE_URL}/v1/checkout-sessions/:checkoutId`;

function makeStatusHandler(status: CheckoutStatusResponse["status"]) {
  return http.get(checkoutStatusUrl, () => {
    const body = { status } satisfies CheckoutStatusResponse;

    return HttpResponse.json(body);
  });
}

const checkoutNotFound = http.get(checkoutStatusUrl, () => {
  const body = {
    title: "Checkout not found",
    detail: "No checkout exists with this id.",
    code: "CHECKOUT_NOT_FOUND",
  } satisfies CheckoutNotFoundResponse;

  return problemResponse(404, body);
});

const checkoutServerError = http.get(checkoutStatusUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "Something went wrong on our side. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies CheckoutServerErrorResponse;

  return problemResponse(500, body);
});

const unreachable = http.get(checkoutStatusUrl, () => HttpResponse.error());

export const getCheckoutStatusHandlers = {
  // `success` is the name `dev:mock` falls back to for every endpoint.
  success: makeStatusHandler("succeeded"),
  checkoutPending: makeStatusHandler("pending"),
  checkoutExpired: makeStatusHandler("expired"),
  checkoutRefunded: makeStatusHandler("refunded"),
  checkoutNotFound,
  checkoutServerError,
  unreachable,
};
