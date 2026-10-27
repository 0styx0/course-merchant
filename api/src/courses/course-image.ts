import sharp, { type Metadata } from "sharp";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import type { ValidationError } from "@/common/errors/validation.exception.js";

export const COURSE_IMAGE_WIDTH = 1600;
export const COURSE_IMAGE_HEIGHT = 900;

const MIN_WIDTH = 800;
const MIN_HEIGHT = 450;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

const ACCEPTED_FORMATS = ["jpeg", "png", "webp"];

// Formats we never accept. Blocking their loaders keeps their parsers away from
// untrusted bytes. A misspelt name is silently ignored, so each has a test.
sharp.block({
  operation: [
    "VipsForeignLoadSvg",
    "VipsForeignLoadHeif",
    "VipsForeignLoadPdf",
    "VipsForeignLoadNsgif",
    "VipsForeignLoadTiff",
  ],
});

export type CourseImageConversion =
  | { state: "converted"; webp: Buffer }
  | { state: "rejected"; error: ValidationError };

function reject(code: FieldErrorCode, detail: string): CourseImageConversion {
  return { state: "rejected", error: { field: "/image", code, detail } };
}

async function readMetadata(bytes: Buffer): Promise<Metadata | null> {
  try {
    return await sharp(bytes).metadata();
  } catch {
    return null;
  }
}

function findMetadataViolation(
  metadata: Metadata | null,
): CourseImageConversion | null {
  if (!metadata || !ACCEPTED_FORMATS.includes(metadata.format)) {
    return reject(
      FieldErrorCode.INVALID_FORMAT,
      "The image must be a JPEG, PNG or WebP file.",
    );
  }

  if (metadata.width * metadata.height > MAX_PIXELS) {
    return reject(
      FieldErrorCode.ABOVE_MAXIMUM,
      `The image has too many pixels. Use one under ${MAX_PIXELS / 1_000_000} megapixels.`,
    );
  }

  // Judged as the photo will look, after its orientation flag is applied.
  const { width, height } = metadata.autoOrient;

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return reject(
      FieldErrorCode.BELOW_MINIMUM,
      `The image must be at least ${MIN_WIDTH}×${MIN_HEIGHT} pixels.`,
    );
  }

  return null;
}

/**
 * Checks an uploaded image by its content, never its name or Content-Type, and
 * re-encodes it as a 1600×900 WebP. Re-encoding drops all metadata.
 */
export async function convertCourseImage(
  bytes: Buffer | undefined,
): Promise<CourseImageConversion> {
  if (!bytes) {
    return reject(FieldErrorCode.REQUIRED, "An image file is required.");
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    return reject(
      FieldErrorCode.ABOVE_MAXIMUM,
      `The image file must be ${MAX_IMAGE_BYTES / 1024 / 1024} MB or smaller.`,
    );
  }

  const violation = findMetadataViolation(await readMetadata(bytes));

  if (violation) {
    return violation;
  }

  const webp = await sharp(bytes, { limitInputPixels: MAX_PIXELS })
    .autoOrient()
    .resize(COURSE_IMAGE_WIDTH, COURSE_IMAGE_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .webp()
    .toBuffer();

  return { state: "converted", webp };
}
