import {
  ArgumentsHost,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiException } from "@/common/errors/api.exception.js";
import {
  ERROR_DEFINITIONS,
  ErrorCode,
  FieldErrorCode,
} from "@/common/errors/error-codes.js";
import { ProblemDetailsFilter } from "@/common/errors/problem-details.filter.js";
import { ValidationException } from "@/common/errors/validation.exception.js";

function run(exception: unknown) {
  const res = {
    headersSent: false,
    set: vi.fn(),
    status: vi.fn(),
    type: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.type.mockReturnValue(res);
  res.json.mockReturnValue(res);

  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter().catch(exception, host);

  return {
    status: res.status.mock.calls[0][0] as number,
    body: res.json.mock.calls[0][0] as Record<string, unknown>,
    headers: res.set.mock.calls.map(([headers]: unknown[]) => headers),
  };
}

describe("ProblemDetailsFilter", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ApiException", () => {
    it("responds with the status, title and code from its definition", () => {
      const { status, body } = run(
        new ApiException(ErrorCode.COURSE_NOT_FOUND),
      );

      const def = ERROR_DEFINITIONS[ErrorCode.COURSE_NOT_FOUND];
      expect(status).toBe(def.status);
      expect(body.title).toBe(def.title);
      expect(body.code).toBe(ErrorCode.COURSE_NOT_FOUND);
      expect(body.detail).toBe("");
    });

    it("includes a detail override when provided", () => {
      const { body } = run(
        new ApiException(ErrorCode.COURSE_NOT_FOUND, {
          detail: "No course with that ID.",
        }),
      );

      expect(body.detail).toBe("No course with that ID.");
    });

    it("does not expose the cause", () => {
      const { body } = run(
        new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, {
          cause: new Error("secret-db-password"),
        } as ConstructorParameters<typeof ApiException>[1]),
      );

      expect(JSON.stringify(body)).not.toContain("secret-db-password");
    });
  });

  describe("ApiException headers", () => {
    it("sets the headers the exception carries", () => {
      const { status, headers } = run(
        new ApiException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS, {
          headers: { "Retry-After": "900" },
        }),
      );

      expect(status).toBe(429);
      expect(headers).toEqual([{ "Retry-After": "900" }]);
    });
  });

  describe("ValidationException", () => {
    it("returns all validation errors in the response body", () => {
      const errors = [
        {
          field: "/name",
          code: FieldErrorCode.TOO_SHORT,
          detail: "Name is required",
        },
        {
          field: "/prices",
          code: FieldErrorCode.INVALID_TYPE,
          detail: "Prices must be an array",
        },
      ];

      const { status, body } = run(new ValidationException(errors));

      expect(status).toBe(400);
      expect(body.title).toBe("Validation failed");
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(body.errors).toEqual(errors);
      expect(body.detail).toBe("The request contains 2 invalid fields.");
    });

    it("does not log validation errors", () => {
      run(
        new ValidationException([
          {
            field: "/name",
            code: FieldErrorCode.TOO_SHORT,
            detail: "Name is required",
          },
        ]),
      );

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("HttpException", () => {
    it("derives status, title and a string code from the status", () => {
      const { status, body } = run(new NotFoundException());

      expect(status).toBe(404);
      expect(body.title).toBe("Not Found");
      expect(body.code).toBe("404");
    });

    it("forwards the message as detail for 4xx", () => {
      const { body } = run(new ForbiddenException("no access"));

      expect(body.detail).toBe("no access");
    });

    it("does not leak the message for 5xx", () => {
      const { status, body } = run(
        new ServiceUnavailableException("db at 10.0.0.5 down"),
      );

      expect(status).toBe(503);
      expect(body.detail).toBe("");
      expect(JSON.stringify(body)).not.toContain("10.0.0.5");
    });

    it("falls back safely for a status without standard text", () => {
      const { status, body } = run(new HttpException("odd", 599));

      expect(status).toBe(599);
      expect(body.title).toBe("Error");
      expect(body.code).toBe("599");
    });
  });

  describe("unknown errors", () => {
    it("returns a generic 500 and does not leak the message", () => {
      const { status, body } = run(new Error("secret-db-password"));

      const def = ERROR_DEFINITIONS[ErrorCode.INTERNAL_SERVER_ERROR];
      expect(status).toBe(def.status);
      expect(body.title).toBe(def.title);
      expect(body.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(body.detail).toBe("");
      expect(JSON.stringify(body)).not.toContain("secret-db-password");
    });

    it.each([["a string"], [42], [null], [undefined], [{ foo: "bar" }]])(
      "returns a generic 500 when a non-Error value (%j) is thrown",
      (thrown) => {
        const { status, body } = run(thrown);

        expect(status).toBe(500);
        expect(body.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      },
    );
  });

  describe("logging", () => {
    it("logs unknown errors with message and stack", () => {
      const error = new Error("boom");

      run(error);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("boom", error.stack);
    });

    it("logs 5xx HttpExceptions even though the message is hidden", () => {
      const error = new ServiceUnavailableException("upstream down");

      run(error);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("upstream down", error.stack);
    });

    it("logs 5xx ApiExceptions", () => {
      run(new ApiException(ErrorCode.INTERNAL_SERVER_ERROR));

      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it("does not log 4xx errors", () => {
      run(new ApiException(ErrorCode.COURSE_NOT_FOUND));
      run(new NotFoundException());

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
