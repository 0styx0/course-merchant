import { HttpException } from "@nestjs/common";
import { ErrorCode, ERROR_DEFINITIONS } from "./error-codes.js";

export interface ApiExceptionOptions {
    /** Occurrence-specific explanation. Omitted from the response if not set. */
    detail?: string;
  }
  
  export class ApiException extends HttpException {
    readonly code: ErrorCode;
    readonly title: string;
    readonly detail: string;
  
    constructor(code: ErrorCode, options: ApiExceptionOptions = {}) {
      const { status, title } = ERROR_DEFINITIONS[code];
      super({ title, detail: options.detail, code }, status)
      
      this.code = code;
      this.title = title;
      this.detail = options.detail || "";
    }
  }