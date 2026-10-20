import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "./create-course-validation.pipe.js";
import { ValidationException } from "@/common/errors/validation.exception.js";

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
          code: "too_small",
          message: "Name is required.",
        },
        {
          field: "/amount",
          code: "invalid_type",
          message: "Amount must be a number.",
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
            validationCode: "SCHEDULE_END_TIME_INVALID_RANGE",
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
          code: "SCHEDULE_END_TIME_INVALID_RANGE",
          message: "End time must be after start time.",
        },
      ]);
    });
  });
});