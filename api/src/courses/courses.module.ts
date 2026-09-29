import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { PrismaModule } from './../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [CoursesService]
})
export class CoursesModule {}
