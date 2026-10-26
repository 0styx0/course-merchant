import {
  Body,
  Controller,
  Delete,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";

import type { AdminSessionResponse, CreateAdminSessionRequest } from "types.js";
import { ZodValidationPipe } from "@/common/validation/zod-validation.pipe.js";
import {
  AdminSessionsService,
  type CurrentAdminSession,
} from "./admin-sessions.service.js";
import { CurrentSession } from "./current-admin-session.decorator.js";
import { Public } from "./public.decorator.js";
import { createAdminSessionRequestSchema } from "./validation/create-admin-session-request.schema.js";

@Controller({
  path: "admin/sessions",
  version: "1",
})
export class AdminSessionsController {
  constructor(
    @Inject(AdminSessionsService)
    private readonly adminSessions: AdminSessionsService,
  ) {}

  // the body holds a secret, so no cache may keep it
  @Public()
  @Post()
  @Header("Cache-Control", "no-store")
  logIn(
    @Body(new ZodValidationPipe(createAdminSessionRequestSchema))
    request: CreateAdminSessionRequest,
  ): Promise<AdminSessionResponse> {
    return this.adminSessions.logIn(request);
  }

  @Delete("current")
  @HttpCode(HttpStatus.NO_CONTENT)
  logOut(@CurrentSession() session: CurrentAdminSession): Promise<void> {
    return this.adminSessions.logOut(session.sessionId);
  }
}
