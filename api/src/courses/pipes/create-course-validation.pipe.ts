import { ValidationException } from "@/common/errors/validation.exception.js";
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
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new ValidationException(
      result.error.issues.map((issue) => ({
        field: toJsonPointer(issue.path),
        code: getValidationCode(issue) ?? issue.code,
        message: issue.message,
      })),
    );
  }
}

function getValidationCode(
  issue: z.core.$ZodIssue,
): string | undefined {
  if (issue.code !== "custom") {
    return undefined;
  }

  const code = issue.params?.validationCode;

  // undefined = fallback to zod in the caller
  return typeof code === "string" ? code : undefined;
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
