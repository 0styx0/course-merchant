import { afterEach, describe, expect, it, vi } from "vitest";

import {
  courseImageSchema,
  MAX_IMAGE_BYTES,
  measureImage,
  type ChosenImage,
} from "./course-image";

function fileOf(type: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], "photo", { type });
}

function chosen(overrides: Partial<ChosenImage> = {}): ChosenImage {
  return { file: fileOf("image/jpeg"), width: 1600, height: 900, ...overrides };
}

function problemOf(image: ChosenImage) {
  const result = courseImageSchema.safeParse(image);
  return result.success ? undefined : result.error.issues[0].message;
}

describe("courseImageSchema", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(problemOf(chosen({ file: fileOf(type) }))).toBeUndefined();
  });

  it("refuses another type", () => {
    expect(problemOf(chosen({ file: fileOf("image/gif") }))).toBe(
      "The image must be a JPEG, PNG or WebP file.",
    );
  });

  it("accepts exactly 5 MB and refuses one byte more", () => {
    const atLimit = chosen({ file: fileOf("image/png", MAX_IMAGE_BYTES) });
    const over = chosen({ file: fileOf("image/png", MAX_IMAGE_BYTES + 1) });
    expect(problemOf(atLimit)).toBeUndefined();
    expect(problemOf(over)).toBe("The image must be 5 MB or smaller.");
  });

  it("reports a file that couldn't be measured as unreadable", () => {
    expect(problemOf(chosen({ width: 0, height: 0 }))).toBe(
      "This file couldn't be read as an image. Choose another.",
    );
  });

  it("accepts exactly 800 × 450 and refuses a smaller side", () => {
    expect(problemOf(chosen({ width: 800, height: 450 }))).toBeUndefined();
    const message = "The image must be at least 800 × 450 pixels.";
    expect(problemOf(chosen({ width: 799, height: 450 }))).toBe(message);
    expect(problemOf(chosen({ width: 800, height: 449 }))).toBe(message);
  });

  it("accepts exactly 25 megapixels and refuses one more", () => {
    expect(problemOf(chosen({ width: 5000, height: 5000 }))).toBeUndefined();
    expect(problemOf(chosen({ width: 5001, height: 5000 }))).toBe(
      "The image must be 25 megapixels or fewer.",
    );
  });

  it("reports the type before the size", () => {
    const file = fileOf("image/gif", MAX_IMAGE_BYTES + 1);
    expect(problemOf(chosen({ file }))).toBe(
      "The image must be a JPEG, PNG or WebP file.",
    );
  });
});

describe("measureImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the size with the photo's orientation, then releases the bitmap", async () => {
    const close = vi.fn();
    const createImageBitmap = vi.fn().mockResolvedValue({
      width: 1200,
      height: 700,
      close,
    });
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const file = fileOf("image/jpeg");

    expect(await measureImage(file)).toEqual({
      file,
      width: 1200,
      height: 700,
    });
    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
    expect(close).toHaveBeenCalled();
  });

  it("gives 0 × 0 when the file can't be decoded", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error()));
    const file = fileOf("image/jpeg");

    expect(await measureImage(file)).toEqual({ file, width: 0, height: 0 });
  });
});
