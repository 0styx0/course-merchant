import { FieldErrorCode } from "@/common/errors/error-codes.js";
import { ValidationError, ValidationException } from "@/common/errors/validation.exception.js";
import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import z from "zod";

export class ZodValidationPipe<
  TSchema extends z.ZodType,
> implements PipeTransform<unknown, z.output<TSchema>> {
  constructor(private readonly schema: TSchema) {}

  transform(
    value: unknown,
    _metadata: ArgumentMetadata,
  ): z.output<TSchema> {
    // reportInput tells a missing or null field apart from a wrong type
    const result = this.schema.safeParse(value, { reportInput: true });

    if (result.success) {
      return result.data;
    }

    throw new ValidationException(
      result.error.issues.flatMap(toValidationErrors),
    );
  }
}

function toValidationErrors(
  issue: z.core.$ZodIssue,
): ValidationError[] {
  // one entry per unknown key, so each points at the offending field
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      field: toJsonPointer([...issue.path, key]),
      code: FieldErrorCode.UNKNOWN_FIELD,
      detail: `Unknown field '${key}'.`,
    }));
  }

  return [
    {
      field: toJsonPointer(issue.path),
      code: toFieldErrorCode(issue),
      detail: issue.message,
    },
  ];
}

function toFieldErrorCode(issue: z.core.$ZodIssue): FieldErrorCode {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null
        ? FieldErrorCode.REQUIRED
        : FieldErrorCode.INVALID_TYPE;
    case "too_small":
      return isNumeric(issue.origin)
        ? FieldErrorCode.BELOW_MINIMUM
        : FieldErrorCode.TOO_SHORT;
    case "too_big":
      return isNumeric(issue.origin)
        ? FieldErrorCode.ABOVE_MAXIMUM
        : FieldErrorCode.TOO_LONG;
    case "invalid_format":
      return FieldErrorCode.INVALID_FORMAT;
    case "custom":
      return getValidationCode(issue) ?? FieldErrorCode.INVALID_VALUE;
    default:
      return FieldErrorCode.INVALID_VALUE;
  }
}

function isNumeric(origin: string): boolean {
  return origin === "number" || origin === "bigint";
}

function getValidationCode(
  issue: z.core.$ZodIssueCustom,
): FieldErrorCode | undefined {
  const code = issue.params?.validationCode;

  // undefined = fallback in the caller
  return Object.values(FieldErrorCode).includes(code)
    ? code
    : undefined;
}

export function toJsonPointer(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "";
  }

  return (
    "/" +
    path
      .map(String)
      .map((segment) => segment.replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}
