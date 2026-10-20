import { HttpException, HttpStatus } from "@nestjs/common";

export interface ValidationError {
    field: string;
    code: string;
    message: string;
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