import { PipeTransform, ArgumentMetadata, BadRequestException } from "@nestjs/common";
import z from "zod";


export class ZodValidationPipe<
    TSchema extends z.ZodType,
> implements PipeTransform<unknown, z.output<TSchema>> {
    constructor(private readonly schema: TSchema) { }

    transform(
        value: unknown,
        _metadata: ArgumentMetadata,
    ): z.output<TSchema> {
        const result = this.schema.safeParse(value);

        if (result.success) {
            return result.data;
        }

        throw new BadRequestException({
            code: "REQUEST_VALIDATION_FAILED",
            errors: result.error.issues.map((issue) => ({
                code: getValidationCode(issue) ?? issue.code,
                message: issue.message,
                path: issue.path,
            })),
        });
    }
}

function getValidationCode(
    issue: z.core.$ZodIssue,
): string | undefined {
    if (issue.code !== "custom") {
        return undefined;
    }

    const code = issue.params?.validationCode;

    return typeof code === "string" ? code : undefined;
}
