import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { CurrentAdminSession } from "./sessions/admin-sessions.service.js";

export type AdminSessionRequest = Request & {
  adminSession?: CurrentAdminSession;
};

/** The session the guard found. Only set on guarded handlers. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAdminSession => {
    const { adminSession } = context
      .switchToHttp()
      .getRequest<AdminSessionRequest>();

    if (!adminSession) {
      throw new Error(
        "CurrentSession was used on a handler without the guard.",
      );
    }

    return adminSession;
  },
);
