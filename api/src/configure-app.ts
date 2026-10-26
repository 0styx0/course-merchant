import { VersioningType } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { ProblemDetailsFilter } from "./common/errors/problem-details.filter.js";

// config shared between prod and with e2e tests
export function configureApp(app: NestExpressApplication) {
  // don't tell scanners which framework to probe for known bugs
  app.disable("x-powered-by");

  // browsers must trust Content-Type instead of guessing, so a JSON body
  // holding HTML-like text is never run as a page. Set before routing, so
  // error responses carry it too
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  return app
    .enableVersioning({
      type: VersioningType.URI,
    })
    .useGlobalFilters(new ProblemDetailsFilter());
}
