import { Module } from "@nestjs/common";
import { CoursesService } from "./courses.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { CoursesRepository } from "./repositories/courses.repository.js";
import { CoursesController } from "./courses.controller.js";
import { AdminCoursesController } from "./admin/admin-courses.controller.js";
import { AdminCoursesService } from "./admin/admin-courses.service.js";
import { AdminCoursesRepository } from "./repositories/admin-courses.repository.js";
import { AdminCourseImagesController } from "./images/admin-course-images.controller.js";
import { AdminCourseImagesService } from "./images/admin-course-images.service.js";
import { CourseImagesRepository } from "./repositories/course-images.repository.js";

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
