import { Module } from "@nestjs/common";
import { CoursesService } from "./courses.service.js";
import { PrismaModule } from "./../prisma/prisma.module.js";
import { CoursesRepository } from "./courses.repository/courses.repository.js";
import { CoursesController } from "./courses.controller.js";
import { AdminCoursesController } from "./admin-courses.controller.js";
import { AdminCoursesService } from "./admin-courses.service.js";
import { AdminCoursesRepository } from "./courses.repository/admin-courses.repository.js";
import { AdminCourseImagesController } from "./admin-course-images.controller.js";
import { AdminCourseImagesService } from "./admin-course-images.service.js";
import { CourseImagesRepository } from "./courses.repository/course-images.repository.js";

@Module({
  imports: [PrismaModule],
  controllers: [
    CoursesController,
    AdminCoursesController,
    AdminCourseImagesController,
  ],
  providers: [
    CoursesService,
    AdminCoursesService,
    AdminCourseImagesService,
    CoursesRepository,
    AdminCoursesRepository,
    CourseImagesRepository,
  ],
})
export class CoursesModule {}
