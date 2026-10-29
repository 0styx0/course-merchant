import { Inject, Injectable } from "@nestjs/common";

import { ValidationException } from "@/common/errors/validation.exception.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { courseImageNotFound, courseNotFound } from "../course-errors.js";
import { convertCourseImage } from "./course-image.js";
import { AdminCoursesRepository } from "../repositories/admin-courses.repository.js";
import { CourseImagesRepository } from "../repositories/course-images.repository.js";

@Injectable()
export class AdminCourseImagesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
    @Inject(CourseImagesRepository)
    private readonly imagesRepository: CourseImagesRepository,
  ) {}

  /** Two uploads at once are fine: the last one saved stays. */
  async uploadImage(courseId: string, file: Buffer | undefined) {
    await this.requireCourse(courseId);

    // CPU work, so it runs before any database write
    const conversion = await convertCourseImage(file);

    if (conversion.state === "rejected") {
      throw new ValidationException([conversion.error]);
    }

    await this.imagesRepository.saveImage(
      this.prisma.db,
      courseId,
      conversion.webp,
    );
  }

  async findImageBytes(courseId: string): Promise<Uint8Array> {
    const image = await this.imagesRepository.findImage(
      this.prisma.db,
      courseId,
    );

    if (image) {
      return image.bytes;
    }

    await this.requireCourse(courseId);
    throw courseImageNotFound(courseId);
  }

  private async requireCourse(courseId: string) {
    const exists = await this.coursesRepository.courseExists(
      this.prisma.db,
      courseId,
    );

    if (!exists) {
      throw courseNotFound(courseId);
    }
  }
}
