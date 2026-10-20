import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { PrismaModule } from './../prisma/prisma.module.js';
import { CoursesRepository } from './courses.repository/courses.repository.js';
import { CoursesController } from './courses.controller.js';
import { AdminCoursesController } from './admin-courses.controller.js';
import { AdminCoursesService } from './admin-courses.service.js';
import { AdminCoursesRepository } from './courses.repository/admin-courses.repository.js';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController, AdminCoursesController],
  providers: [CoursesService, AdminCoursesService, CoursesRepository, AdminCoursesRepository]
})
export class CoursesModule {}
