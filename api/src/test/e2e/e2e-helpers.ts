import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "@/app.module.js";
import { configureApp } from "@/configure-app.js";

export async function createE2eApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  configureApp(app);

  await app.init();

  return app;
}