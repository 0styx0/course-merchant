import { HttpStatus } from "@nestjs/common";

export enum ErrorCodeGeneric {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export enum ErrorCodeCourse {
  COURSE_NOT_FOUND = "COURSE_NOT_FOUND",
  INVALID_COURSE_ID = "INVALID_COURSE_ID",
}

export enum ErrorCodeValidation {
  VALIDATION_FAILED = "VALIDATION_FAILED",
}

export enum ErrorCodeCheckout {
  COURSE_NOT_PURCHASABLE = "COURSE_NOT_PURCHASABLE",
  CHECKOUT_NOT_FOUND = "CHECKOUT_NOT_FOUND",
  PAYMENT_PROVIDER_UNAVAILABLE = "PAYMENT_PROVIDER_UNAVAILABLE",
}

export enum ErrorCodeWebhook {
  INVALID_WEBHOOK_SIGNATURE = "INVALID_WEBHOOK_SIGNATURE",
}

export enum ErrorCodeAuth {
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOO_MANY_LOGIN_ATTEMPTS = "TOO_MANY_LOGIN_ATTEMPTS",
}

// Codes for each entry of a validation response's `errors`. They are generic;
// the entry's `field` says which field failed.
export enum FieldErrorCode {
  REQUIRED = "REQUIRED",
  INVALID_TYPE = "INVALID_TYPE",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_VALUE = "INVALID_VALUE",
  TOO_SHORT = "TOO_SHORT",
  TOO_LONG = "TOO_LONG",
  BELOW_MINIMUM = "BELOW_MINIMUM",
  ABOVE_MAXIMUM = "ABOVE_MAXIMUM",
  IN_PAST = "IN_PAST",
  INVALID_RANGE = "INVALID_RANGE",
  DUPLICATE_VALUE = "DUPLICATE_VALUE",
  UNKNOWN_FIELD = "UNKNOWN_FIELD",
}

export const ErrorCode = {
  ...ErrorCodeCourse,
  ...ErrorCodeGeneric,
  ...ErrorCodeValidation,
  ...ErrorCodeCheckout,
  ...ErrorCodeWebhook,
  ...ErrorCodeAuth,
};

export type ErrorCode =
  | ErrorCodeCourse
  | ErrorCodeGeneric
  | ErrorCodeValidation
  | ErrorCodeCheckout
  | ErrorCodeWebhook
  | ErrorCodeAuth;

interface ErrorDefinition {
  status: HttpStatus;
  title: string;
}

export const ERROR_DEFINITIONS = {
  [ErrorCode.COURSE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    title: "Course not found",
  },
  [ErrorCode.INVALID_COURSE_ID]: {
    status: HttpStatus.BAD_REQUEST,
    title: "Invalid course ID",
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    title: "Internal server error",
  },
  [ErrorCode.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    title: "Validation failed",
  },
  [ErrorCode.COURSE_NOT_PURCHASABLE]: {
    status: HttpStatus.CONFLICT,
    title: "Course not purchasable",
  },
  [ErrorCode.CHECKOUT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    title: "Checkout not found",
  },
  [ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: "Payment provider unavailable",
  },
  [ErrorCode.INVALID_WEBHOOK_SIGNATURE]: {
    status: HttpStatus.BAD_REQUEST,
    title: "Invalid webhook signature",
  },
  [ErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    title: "Unauthorized",
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    title: "Invalid credentials",
  },
  [ErrorCode.TOO_MANY_LOGIN_ATTEMPTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    title: "Too many login attempts",
  },
} satisfies Record<ErrorCode, ErrorDefinition>;
