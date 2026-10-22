import { Test, type TestingModuleBuilder } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "@/app.module.js";
import { configureApp } from "@/configure-app.js";

/**
 * @param overrides replaces providers before the app starts, for example a
 * fake StripeService so tests never call Stripe
 */
export async function createE2eApp(
  overrides: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<INestApplication> {
  const moduleRef = await overrides(
    Test.createTestingModule({
      imports: [AppModule],
    }),
  ).compile();

  // same as main.ts, so webhook signatures can be checked in tests
  const app = moduleRef.createNestApplication({ rawBody: true });

  configureApp(app);

  await app.init();

  return app;
}
