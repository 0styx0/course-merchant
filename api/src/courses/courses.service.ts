import { Inject, Injectable } from "@nestjs/common";
import { GetCourseResponse, ListCoursesResponse } from "types.js";
import { CourseRepositoryModel, CoursesRepository } from "./courses.repository/courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";
import { formatDate } from "../utils/formatters.js";
import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";

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

        return formatCourseResponse(course)
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

    return formatCourseResponse(course)
  }
}

function formatCourseResponse(course: CourseRepositoryModel): GetCourseResponse {

  const [price] = course.prices
  return {
    id: course.id,
    name: course.title,
    description: course.description,
    enrollmentCount: course.enrollments,
    price: {
      amount: price.amount,
      currency: price.currency,
    },
    schedule: {
      startTime: formatDate(course.startsAt, course.timeZone),
      endTime: formatDate(course.endsAt, course.timeZone),
      timeZone: course.timeZone,
    },
  };
}

function validatePublicCourse(course: CourseRepositoryModel | null): asserts course is CourseRepositoryModel {

  if (!course || !course.prices.length) {
    throw new ApiException(
      ErrorCodeCourseGet.COURSE_NOT_FOUND,
    );
  }
}