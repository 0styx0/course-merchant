import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module.js";
import { CoursesModule } from "./courses/courses.module.js";
import { CheckoutModule } from "./checkout/checkout.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AdminEnrollmentsModule } from "./admin-enrollments/admin-enrollments.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CoursesModule,
    CheckoutModule,
    WebhooksModule,
    AuthModule,
    AdminEnrollmentsModule,
  ],
})
export class AppModule {}
