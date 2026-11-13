import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCode } from "@/common/errors/error-codes.js";
import { Injectable, PipeTransform } from "@nestjs/common";
import { z } from "zod";

// any 8-4-4-4-12 hex id, which is what postgres accepts for a uuid column
const guidSchema = z.guid();

@Injectable()
export class ParseGuidPipe implements PipeTransform<string, string> {
  constructor(
    private readonly errorCode: ErrorCode,
    private readonly noun: string,
  ) {}

  transform(value: string): string {
    if (guidSchema.safeParse(value).success) {
      return value;
    }

    throw new ApiException(this.errorCode, {
      detail: `'${value}' is not a valid ${this.noun} identifier.`,
    });
  }
}
