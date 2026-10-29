import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "@/common/validation/zod-validation.pipe.js";
import { ValidationException } from "@/common/errors/validation.exception.js";
import { FieldErrorCode } from "@/common/errors/error-codes.js";

function captureValidationException(
  action: () => unknown,
): ValidationException {
  try {
    action();
  } catch (error) {
    if (error instanceof ValidationException) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected a ValidationException.");
}

describe("ZodValidationPipe", () => {
  describe("valid input", () => {
    it("returns the parsed output from the schema", () => {
      const schema = z.strictObject({
        name: z.string().trim(),
        amount: z.coerce.number(),
      });

      const pipe = new ZodValidationPipe(schema);

      const result = pipe.transform(
        {
          name: "  React Fundamentals  ",
          amount: "50",
        },
        { type: "body" },
      );

      expect(result).toEqual({
        name: "React Fundamentals",
        amount: 50,
      });
    });
  });

  describe("invalid input", () => {
    it("returns all validation issues in a ValidationException", () => {
      const schema = z.strictObject({
        name: z.string().min(1, {
          error: "Name is required.",
        }),
        amount: z.number({
          error: "Amount must be a number.",
        }),
      });

      const pipe = new ZodValidationPipe(schema);

      const exception = captureValidationException(() =>
        pipe.transform(
          {
            name: "",
            amount: "50",
          },
          { type: "body" },
        ),
      );

      expect(exception.getStatus()).toBe(400);
      expect(exception.errors).toEqual([
        {
          field: "/name",
          code: "TOO_SHORT",
          detail: "Name is required.",
        },
        {
          field: "/amount",
          code: "INVALID_TYPE",
          detail: "Amount must be a number.",
        },
      ]);
    });
  });

  describe("custom validation codes", () => {
    it("preserves the application-specific code on a custom issue", () => {
      const schema = z.string().superRefine((_value, ctx) => {
        ctx.addIssue({
          code: "custom",
          message: "End time must be after start time.",
          params: {
            validationCode: FieldErrorCode.INVALID_RANGE,
          },
        });
      });

      const pipe = new ZodValidationPipe(schema);

      const exception = captureValidationException(() =>
        pipe.transform("invalid schedule", { type: "body" }),
      );

      expect(exception.getStatus()).toBe(400);
      expect(exception.errors).toEqual([
        {
          field: "",
          code: "INVALID_RANGE",
          detail: "End time must be after start time.",
        },
      ]);
    });
  });
  describe("generic field error codes", () => {
    function codesFor(schema: z.ZodType, value: unknown) {
      const exception = captureValidationException(() =>
        new ZodValidationPipe(schema).transform(value, { type: "body" }),
      );

      return exception.errors.map(({ field, code }) => ({ field, code }));
    }

    it("reports a missing or null field as REQUIRED", () => {
      const schema = z.strictObject({ name: z.string(), title: z.string() });

      expect(codesFor(schema, { title: null })).toEqual([
        { field: "/name", code: "REQUIRED" },
        { field: "/title", code: "REQUIRED" },
      ]);
    });

    it("reports a non-integer as INVALID_TYPE", () => {
      expect(
        codesFor(z.object({ amount: z.number().int() }), { amount: 1.5 }),
      ).toEqual([{ field: "/amount", code: "INVALID_TYPE" }]);
    });

    it("distinguishes lengths from numeric bounds", () => {
      const schema = z.object({
        name: z.string().max(2),
        prices: z.array(z.number()).min(1),
        amount: z.number().min(50),
        limit: z.number().max(10),
      });

      expect(
        codesFor(schema, { name: "long", prices: [], amount: 1, limit: 11 }),
      ).toEqual([
        { field: "/name", code: "TOO_LONG" },
        { field: "/prices", code: "TOO_SHORT" },
        { field: "/amount", code: "BELOW_MINIMUM" },
        { field: "/limit", code: "ABOVE_MAXIMUM" },
      ]);
    });

    it("reports malformed values as INVALID_FORMAT and unknown ones as INVALID_VALUE", () => {
      const schema = z.object({
        startTime: z.iso.datetime(),
        status: z.enum(["published"]),
        timeZone: z.string().refine(() => false),
      });

      expect(
        codesFor(schema, {
          startTime: "soon",
          status: "gone",
          timeZone: "Mars",
        }),
      ).toEqual([
        { field: "/startTime", code: "INVALID_FORMAT" },
        { field: "/status", code: "INVALID_VALUE" },
        { field: "/timeZone", code: "INVALID_VALUE" },
      ]);
    });

    it("reports each unknown key as its own UNKNOWN_FIELD", () => {
      const schema = z.strictObject({
        prices: z.array(z.strictObject({ amount: z.number() })),
      });

      expect(
        codesFor(schema, { prices: [{ amount: 1, id: "x" }], extra: 1 }),
      ).toEqual([
        { field: "/prices/0/id", code: "UNKNOWN_FIELD" },
        { field: "/extra", code: "UNKNOWN_FIELD" },
      ]);
    });

    it("falls back to INVALID_VALUE for an unrecognized custom code", () => {
      const schema = z.string().refine(() => false, {
        params: { validationCode: "NOT_A_REAL_CODE" },
      });

      expect(codesFor(schema, "x")).toEqual([
        { field: "", code: "INVALID_VALUE" },
      ]);
    });
  });
});
