import "./temporal.js";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

async function bootstrap() {
  // keeps the exact request bytes on `req.rawBody`, which Stripe's webhook
  // signature is checked against
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // on SIGTERM (a deploy), lets modules finish what they're doing, such as the
  // email worker's current send, before the process exits
  app.enableShutdownHooks();

  const configuredApp = configureApp(app);
  await configuredApp.listen(process.env.PORT ?? 3000);
}

void bootstrap();
