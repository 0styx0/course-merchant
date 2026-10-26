import { HttpException } from "@nestjs/common";
import { ErrorCode, ERROR_DEFINITIONS } from "./error-codes.js";

export interface ApiExceptionOptions {
  detail?: string;
  /** Response headers the error needs, e.g. `Retry-After`. */
  headers?: Record<string, string>;
}

export class ApiException extends HttpException {
  readonly code: ErrorCode;
  readonly title: string;
  readonly detail: string;
  readonly headers: Record<string, string>;

  constructor(code: ErrorCode, options: ApiExceptionOptions = {}) {
    const { status, title } = ERROR_DEFINITIONS[code];
    super({ title, detail: options.detail, code }, status);

    this.code = code;
    this.title = title;
    this.detail = options.detail || "";
    this.headers = options.headers ?? {};
  }
}
