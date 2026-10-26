import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";

import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeAuth } from "@/common/errors/error-codes.js";
import { AdminSessionsService } from "./admin-sessions.service.js";
import type { AdminSessionRequest } from "./current-admin-session.decorator.js";
import { IS_PUBLIC } from "./public.decorator.js";
import { isWellFormedSessionToken } from "./session-token.js";

// the scheme name is case-insensitive (RFC 7235)
const BEARER_HEADER = /^bearer +(\S+)$/i;

function bearerToken(header: string | undefined): string | null {
  const token = header?.match(BEARER_HEADER)?.[1];

  return token && isWellFormedSessionToken(token) ? token : null;
}

/** Same answer whatever was wrong with the token. */
function unauthorized() {
  return new ApiException(ErrorCodeAuth.UNAUTHORIZED, {
    detail: "Authentication is required.",
    headers: { "WWW-Authenticate": "Bearer" },
  });
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AdminSessionsService)
    private readonly sessions: AdminSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AdminSessionRequest>();
    const token = bearerToken(request.headers.authorization);
    const session = token ? await this.sessions.findActiveSession(token) : null;

    if (!session) {
      throw unauthorized();
    }

    request.adminSession = session;
    // set before the handler runs, so error responses to a logged-in caller
    // are covered too
    http.getResponse<Response>().setHeader("Cache-Control", "no-store");

    return true;
  }
}
