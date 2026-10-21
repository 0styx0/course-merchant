import { HttpStatus } from "@nestjs/common";

export enum ErrorCodeGeneric {
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export enum ErrorCodeCourseGet {
    COURSE_NOT_FOUND = "COURSE_NOT_FOUND",
    INVALID_COURSE_ID = "INVALID_COURSE_ID",
}

export enum ErrorCodeValidation {
    VALIDATION_FAILED = "VALIDATION_FAILED",
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
    ...ErrorCodeCourseGet,
    ...ErrorCodeGeneric,
    ...ErrorCodeValidation,
};

export type ErrorCode = ErrorCodeCourseGet | ErrorCodeGeneric | ErrorCodeValidation;

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
} satisfies Record<ErrorCode, ErrorDefinition>;

