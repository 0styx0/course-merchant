import { HttpStatus } from "@nestjs/common";

export enum ErrorCodeGeneric {
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export enum ErrorCodeCourseGet {
    COURSE_NOT_FOUND = "COURSE_NOT_FOUND",
    INVALID_COURSE_ID = "INVALID_COURSE_ID",
}

export const ErrorCode = {
    ...ErrorCodeCourseGet,
    ...ErrorCodeGeneric,
};
export type ErrorCode = ErrorCodeCourseGet | ErrorCodeGeneric;

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
} satisfies Record<ErrorCode, ErrorDefinition>;

