import { STATUS_CODES } from "node:http";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ApiException } from "./api.exception.js";
import { ERROR_DEFINITIONS, ErrorCode } from "./error-codes.js";
import { errorMessage } from "./error-text.js";
import { ValidationException } from "./validation.exception.js";

type Problem = {
  status: number;
  body: Record<string, unknown>;
  headers?: ApiException["headers"];
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    const problem = toProblem(exception);
    if (problem.status >= 500) this.logServerError(exception);
    return sendProblem(res, problem);
  }

  private logServerError(exception: unknown) {
    this.logger.error(
      errorMessage(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
  }
}

function sendProblem(res: Response, { status, body, headers }: Problem) {
  if (headers) res.set(headers);
  return res.status(status).type("application/problem+json").json(body);
}

function toProblem(exception: unknown): Problem {
  if (exception instanceof ValidationException) {
    return validationProblem(exception);
  }
  if (exception instanceof ApiException) return apiProblem(exception);
  if (exception instanceof HttpException) return httpProblem(exception);
  return unknownProblem();
}

function validationProblem(exception: ValidationException): Problem {
  const code = ErrorCode.VALIDATION_FAILED;
  const error = ERROR_DEFINITIONS[code];
  return {
    status: error.status,
    body: {
      title: error.title,
      detail: describeValidationErrors(exception.errors.length),
      code,
      errors: exception.errors,
    },
  };
}

function apiProblem(exception: ApiException): Problem {
  return {
    status: ERROR_DEFINITIONS[exception.code].status,
    headers: exception.headers,
    body: {
      title: exception.title,
      code: exception.code,
      detail: exception.detail,
    },
  };
}

function httpProblem(exception: HttpException): Problem {
  const status = exception.getStatus();
  return {
    status,
    body: {
      title: STATUS_CODES[status] ?? "Error",
      code: String(status),
      detail: status < 500 ? clientDetail(exception) : "", // never leak 5xx messages
    },
  };
}

function unknownProblem(): Problem {
  const { status, title } = ERROR_DEFINITIONS[ErrorCode.INTERNAL_SERVER_ERROR];
  return {
    status,
    body: { title, code: ErrorCode.INTERNAL_SERVER_ERROR, detail: "" },
  };
}

function describeValidationErrors(count: number): string {
  return `The request contains ${count} invalid ${count === 1 ? "field" : "fields"}.`;
}

/**
 * NestJS sometimes sends error details inside the response for validation errors
 */
function clientDetail(exception: HttpException): string {
  const response = exception.getResponse();
  const message =
    typeof response === "object" && response !== null && "message" in response
      ? response.message
      : exception.message;

  return Array.isArray(message) ? message.join("; ") : String(message);
}
