import { HttpException, HttpStatus } from "@nestjs/common";
import { FieldErrorCode } from "./error-codes.js";

export interface ValidationError {
    field: string;
    code: FieldErrorCode;
    detail: string;
  }

  export class ValidationException extends HttpException {
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
      super(
        {
          title: "Validation failed",
          code: "VALIDATION_FAILED",
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );

      this.errors = errors;
    }
  }
