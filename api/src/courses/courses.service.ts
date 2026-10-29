import { Inject, Injectable } from "@nestjs/common";
import { GetCourseResponse, ListCoursesResponse } from "types.js";
import {
  CourseRepositoryModelPublic,
  CoursesRepository,
} from "./repositories/courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";
import { PrismaService } from "@/prisma/prisma.service.js";
import { courseNotFound } from "./course-errors.js";
import { imageVersion, toPublicCourseResponse } from "./courses.mapper.js";
import { CourseImagesRepository } from "./repositories/course-images.repository.js";

@Injectable()
export class CoursesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
    @Inject(CourseImagesRepository)
    private readonly imagesRepository: CourseImagesRepository,
  ) {}

  async findAll(): Promise<ListCoursesResponse> {
    const courses = await this.coursesRepository.findAvailable(
      this.prisma.db,
      Temporal.Now.instant(),
    );

    return {
      courses: courses.map((course) => {
        validatePublicCourse(course, course.id);

        return toPublicCourseResponse(course);
      }),
    };
  }

  async findById(courseId: string): Promise<GetCourseResponse> {
    const now = Temporal.Now.instant();

    const course = await this.coursesRepository.findById(
      this.prisma.db,
      courseId,
      now,
    );

    validatePublicCourse(course, courseId);

    return toPublicCourseResponse(course);
  }

  /** 404 unless `version` is the current version of a visible course's image. */
  async findImageBytes(courseId: string, version: string): Promise<Uint8Array> {
    const image = await this.imagesRepository.findVisibleImage(
      this.prisma.db,
      courseId,
      Temporal.Now.instant(),
    );

    if (!image || imageVersion(image.updatedAt) !== version) {
      throw courseNotFound(courseId);
    }

    return image.bytes;
  }
}

function validatePublicCourse(
  course: CourseRepositoryModelPublic | null,
  courseId: string,
): asserts course is CourseRepositoryModelPublic {
  if (!course || !course.prices.length) {
    throw courseNotFound(courseId);
  }
}
