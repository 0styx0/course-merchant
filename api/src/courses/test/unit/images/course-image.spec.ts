import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import {
  COURSE_IMAGE_HEIGHT,
  COURSE_IMAGE_WIDTH,
  MAX_IMAGE_BYTES,
  convertCourseImage,
} from "@/courses/images/course-image.js";

function blank(width: number, height: number, background = "#3366cc") {
  return sharp({
    create: { width, height, channels: 3, background },
  });
}

function rejectedWith(code: FieldErrorCode) {
  return {
    state: "rejected",
    error: { field: "/image", code, detail: expect.any(String) },
  };
}

describe("convertCourseImage", () => {
  it.each([
    ["JPEG", () => blank(1000, 600).jpeg().toBuffer()],
    ["PNG", () => blank(1000, 600).png().toBuffer()],
    ["WebP", () => blank(1000, 600).webp().toBuffer()],
  ])("converts a %s to a 1600×900 WebP", async (_name, make) => {
    const result = await convertCourseImage(await make());

    expect(result.state).toBe("converted");
    if (result.state !== "converted") return;

    const metadata = await sharp(result.webp).metadata();
    expect(metadata).toMatchObject({
      format: "webp",
      width: COURSE_IMAGE_WIDTH,
      height: COURSE_IMAGE_HEIGHT,
    });
  });

  it("drops metadata such as EXIF and colour profiles", async () => {
    const input = await blank(1000, 600)
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret" } })
      .withIccProfile("srgb")
      .toBuffer();

    const result = await convertCourseImage(input);

    if (result.state !== "converted") throw new Error("not converted");
    const metadata = await sharp(result.webp).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("crops a portrait image instead of refusing it", async () => {
    const result = await convertCourseImage(
      await blank(900, 1600).png().toBuffer(),
    );

    expect(result.state).toBe("converted");
  });

  it("keeps only the first frame of an animated image", async () => {
    // Different colours, or the encoder merges the frames into one.
    const frame = (colour: string) => blank(800, 450, colour).png().toBuffer();
    const animated = await sharp([await frame("red"), await frame("blue")], {
      join: { animated: true },
    })
      .webp({ delay: [100, 100], loop: 0 })
      .toBuffer();
    expect((await sharp(animated, { pages: -1 }).metadata()).pages).toBe(2);

    const result = await convertCourseImage(animated);

    if (result.state !== "converted") throw new Error("not converted");
    const metadata = await sharp(result.webp, { pages: -1 }).metadata();
    expect(metadata.pages ?? 1).toBe(1);
    expect(metadata.height).toBe(COURSE_IMAGE_HEIGHT);
  });

  describe("orientation", () => {
    it("accepts a photo that is large enough once rotated", async () => {
      const input = await blank(450, 800)
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer();

      expect((await convertCourseImage(input)).state).toBe("converted");
    });

    it("refuses a photo that is too small once rotated", async () => {
      const input = await blank(800, 450)
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer();

      expect(await convertCourseImage(input)).toEqual(
        rejectedWith(FieldErrorCode.BELOW_MINIMUM),
      );
    });
  });

  it.each([
    [799, 450],
    [800, 449],
  ])("refuses a %i×%i image as too small", async (width, height) => {
    const input = await blank(width, height).png().toBuffer();

    expect(await convertCourseImage(input)).toEqual(
      rejectedWith(FieldErrorCode.BELOW_MINIMUM),
    );
  });

  it("refuses a missing file", async () => {
    expect(await convertCourseImage(undefined)).toEqual(
      rejectedWith(FieldErrorCode.REQUIRED),
    );
  });

  it.each([
    ["GIF", () => blank(1000, 600).gif().toBuffer()],
    ["TIFF", () => blank(1000, 600).tiff().toBuffer()],
    ["AVIF", () => blank(1000, 600).avif().toBuffer()],
    [
      "SVG",
      () =>
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"/>',
        ),
    ],
    ["plain text", () => Buffer.from("not an image")],
    ["an empty file", () => Buffer.alloc(0)],
    [
      "a truncated JPEG",
      async () => (await blank(1000, 600).jpeg().toBuffer()).subarray(0, 200),
    ],
  ])("refuses %s as an invalid format", async (_name, make) => {
    expect(await convertCourseImage(await make())).toEqual(
      rejectedWith(FieldErrorCode.INVALID_FORMAT),
    );
  });

  it("refuses an image with too many pixels", async () => {
    const input = await blank(5001, 5000).png().toBuffer();

    expect(await convertCourseImage(input)).toEqual(
      rejectedWith(FieldErrorCode.ABOVE_MAXIMUM),
    );
  });

  it("refuses a file over 5 MB without reading it", async () => {
    const input = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    expect(await convertCourseImage(input)).toEqual(
      rejectedWith(FieldErrorCode.ABOVE_MAXIMUM),
    );
  });
});
