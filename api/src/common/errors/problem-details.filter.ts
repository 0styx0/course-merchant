import { STATUS_CODES } from "node:http";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { Response } from "express";
import { ApiException } from "./api.exception.js";
import { ERROR_DEFINITIONS, ErrorCode } from "./error-codes.js";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
    private readonly logger = new Logger(ProblemDetailsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>();
        if (res.headersSent) return;

        const send = (status: number, body: Record<string, unknown>) => {
            if (status >= 500) {
                this.logger.error(
                    exception instanceof Error ? exception.message : String(exception),
                    exception instanceof Error ? exception.stack : undefined,
                );
            }
            return res.status(status).type("application/problem+json").json(body);
        };

        if (exception instanceof ApiException) {
            const { status } = ERROR_DEFINITIONS[exception.code];
            return send(status, {
                title: exception.title,
                code: exception.code,
                detail: exception.detail,
            });
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            return send(status, {
                title: STATUS_CODES[status] ?? "Error",
                code: String(status),
                detail: (status < 500) ? clientDetail(exception) : undefined, // never leak 5xx messages
            });
        }

        const { status, title } = ERROR_DEFINITIONS[ErrorCode.INTERNAL_SERVER_ERROR];
        return send(status, { title, code: ErrorCode.INTERNAL_SERVER_ERROR });
    }
}

/**
 * NestJS sometimes sends error details inside the response for validation errors 
 */
function clientDetail(exception: HttpException): string {
    const response = exception.getResponse();
    const message =
        typeof response === "object" && response !== null && "message" in response
            ? (response as { message: unknown }).message
            : exception.message;

    return Array.isArray(message) ? message.join("; ") : String(message);
}
