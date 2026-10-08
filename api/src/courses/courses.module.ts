import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { PrismaModule } from './../prisma/prisma.module.js';
import { CoursesRepository } from './courses.repository/courses.repository.js';
import { CoursesController } from './courses.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesRepository]
})
export class CoursesModule {}
