import { Inject, Injectable } from "@nestjs/common";
import { GetCourseResponse, ListCoursesResponse } from "types.js";
import { CourseRepositoryModelPublic, CoursesRepository } from "./courses.repository/courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";
import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";
import { toPublicCourseResponse } from "./courses.mapper.js";

@Injectable()
export class CoursesService {
  constructor(
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
  ) { }

  async findAll(): Promise<ListCoursesResponse> {

    const courses = await this.coursesRepository.findAvailable(Temporal.Now.instant());

    return {
      courses: courses.map((course) => {

        validatePublicCourse(course)

        return toPublicCourseResponse(course)
      }),
    };
  }

  async findById(
    courseId: string,
  ): Promise<GetCourseResponse> {
    const now = Temporal.Now.instant();

    const course = await this.coursesRepository.findById(
      courseId,
      now,
    );

    validatePublicCourse(course)

    return toPublicCourseResponse(course)
  }
}

function validatePublicCourse(course: CourseRepositoryModelPublic | null): asserts course is CourseRepositoryModelPublic {

  if (!course || !course.prices.length) {
    throw new ApiException(
      ErrorCodeCourseGet.COURSE_NOT_FOUND,
    );
  }
}