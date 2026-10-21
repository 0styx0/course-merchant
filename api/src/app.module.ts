import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';

@Module({
  imports: [PrismaModule, CoursesModule, CheckoutModule],
})
export class AppModule {}
