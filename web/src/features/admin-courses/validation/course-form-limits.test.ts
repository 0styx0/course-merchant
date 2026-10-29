import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  COURSE_CONTENT_URL_MAX_LENGTH,
  COURSE_DESCRIPTION_MAX_TEXT_LENGTH,
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
  MIN_PAID_PRICE_CENTS,
} from "./course-form-limits";

type Schema = Record<string, unknown>;

const contract = parse(
  readFileSync(resolve("../api/openapi/openapi-v1.yaml"), "utf8"),
) as { components: { schemas: Record<string, Schema> } };
const { schemas } = contract.components;

// Fails with a clear message when the contract is restructured, instead of
// comparing undefined with undefined.
function numberAt(schema: Schema, key: string): number {
  const value = schema[key];
  if (typeof value !== "number") {
    throw new Error(`Expected a number at "${key}", got ${String(value)}`);
  }
  return value;
}

function paidPriceMinimum(): number {
  const { allOf } = schemas.ScheduledPrice as { allOf: Schema[] };
  const inline = allOf.find((part) => "properties" in part) as {
    properties: { amount: { anyOf: Schema[] } };
  };
  const bound = inline.properties.amount.anyOf.find(
    (part) => "minimum" in part,
  );
  if (!bound) throw new Error("ScheduledPrice amount has no minimum");
  return numberAt(bound, "minimum");
}

describe("course form limits match the API contract", () => {
  it.each([
    ["CourseName", "maxLength", COURSE_NAME_MAX_LENGTH],
    ["CourseSummary", "maxLength", COURSE_SUMMARY_MAX_LENGTH],
    ["CourseContentUrl", "maxLength", COURSE_CONTENT_URL_MAX_LENGTH],
    [
      "CourseDescription",
      "x-max-text-length",
      COURSE_DESCRIPTION_MAX_TEXT_LENGTH,
    ],
  ])("%s %s", (schemaName, key, constant) => {
    expect(constant).toBe(numberAt(schemas[schemaName], key));
  });

  it("ScheduledPrice minimum", () => {
    expect(MIN_PAID_PRICE_CENTS).toBe(paidPriceMinimum());
  });
});
