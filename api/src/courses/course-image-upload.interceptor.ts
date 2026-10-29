import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import multer, { MulterError } from "multer";
import type { Observable } from "rxjs";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import { ValidationException } from "@/common/errors/validation.exception.js";
import { MAX_IMAGE_BYTES } from "./course-image.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fields: 0, parts: 1, fileSize: MAX_IMAGE_BYTES },
}).single("image");

/**
 * Turns anything multer throws into a validation error on `/image`. Multer's
 * messages aren't a stable API, so only its error `code` is read; every other
 * error is a malformed body.
 */
export function toUploadException(error: unknown): ValidationException {
  if (error instanceof MulterError) {
    return toMulterException(error);
  }

  return uploadError(
    FieldErrorCode.INVALID_FORMAT,
    "The request body is not a valid multipart upload.",
  );
}

function toMulterException(error: MulterError): ValidationException {
  if (error.code === "LIMIT_FILE_SIZE") {
    return uploadError(
      FieldErrorCode.ABOVE_MAXIMUM,
      `The image file must be ${MAX_IMAGE_BYTES / 1024 / 1024} MB or smaller.`,
    );
  }

  return uploadError(
    FieldErrorCode.UNKNOWN_FIELD,
    "Send exactly one file, in a field named 'image'.",
  );
}

function uploadError(code: FieldErrorCode, detail: string) {
  return new ValidationException([{ field: "/image", code, detail }]);
}

/**
 * Reads the one `image` file of a multipart request into `request.file`, in
 * memory. Nest's `FileInterceptor` is not used because it hides multer's error
 * codes.
 */
@Injectable()
export class CourseImageUploadInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();

    await new Promise<void>((resolve, reject) => {
      upload(
        http.getRequest<Request>(),
        http.getResponse<Response>(),
        (error: unknown) =>
          error ? reject(toUploadException(error)) : resolve(),
      );
    });

    return next.handle();
  }
}
