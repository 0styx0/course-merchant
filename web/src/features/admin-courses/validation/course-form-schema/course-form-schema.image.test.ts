import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { courseFormWithImageSchema } from "../course-form-schema";
import { NOW, validValues } from "./course-form-schema.fixtures";

function issuePaths(
  image: unknown,
  change: (v: ReturnType<typeof validValues>) => void,
) {
  const values = validValues();
  change(values);
  const result = courseFormWithImageSchema.safeParse({ ...values, image });
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("courseFormWithImageSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a missing image", () => {
    expect(issuePaths(null, () => {})).toEqual(["image"]);
  });

  it("still reports the schedule while the image is missing", () => {
    const paths = issuePaths(null, (v) => {
      v.schedule.endDate = "2026-06-30";
    });
    expect(paths).toContain("image");
    expect(paths.some((path) => path.startsWith("schedule"))).toBe(true);
  });
});
