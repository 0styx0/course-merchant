import { z } from "zod";

// The browser's copy of the API's image limits (api/src/courses/images/course-image.ts),
// so the form can warn early. The API checks again.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_WIDTH = 800;
const MIN_HEIGHT = 450;
const MAX_PIXELS = 25_000_000;

/** A chosen file and its pixel size; 0 × 0 when the browser couldn't decode it. */
export type ChosenImage = { file: File; width: number; height: number };

/** Reads the pixel size once, with the photo's orientation applied like on the server. */
export async function measureImage(file: File): Promise<ChosenImage> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const { width, height } = bitmap;
    bitmap.close();
    return { file, width, height };
  } catch {
    return { file, width: 0, height: 0 };
  }
}

function isTooSmall({ width, height }: ChosenImage) {
  return width < MIN_WIDTH || height < MIN_HEIGHT;
}

/** The first problem with the chosen image, or undefined when it is fine. */
function imageProblem(image: ChosenImage): string | undefined {
  if (!ACCEPTED_IMAGE_TYPES.includes(image.file.type)) {
    return "The image must be a JPEG, PNG or WebP file.";
  }
  if (image.file.size > MAX_IMAGE_BYTES) {
    return "The image must be 5 MB or smaller.";
  }
  if (image.width === 0 || image.height === 0) {
    return "This file couldn't be read as an image. Choose another.";
  }
  if (isTooSmall(image)) {
    return "The image must be at least 800 × 450 pixels.";
  }
  if (image.width * image.height > MAX_PIXELS) {
    return "The image must be 25 megapixels or fewer.";
  }
  return undefined;
}

export const courseImageSchema = z
  .object({ file: z.instanceof(File), width: z.number(), height: z.number() })
  .superRefine((image, ctx) => {
    const message = imageProblem(image);
    if (message) ctx.addIssue({ code: "custom", message });
  });
