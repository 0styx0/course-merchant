import { Inject, Injectable } from "@nestjs/common";
import { GetCourseAdminResponse, GetCourseResponse, ListCoursesResponse } from "types.js";
import { CourseRepositoryModelAdmin, CourseRepositoryModelPublic, CoursesRepository } from "./courses.repository/courses.repository.js";
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

  async findByIdAdmin(courseId: string): Promise<GetCourseAdminResponse> {
    const course = await this.coursesRepository.findCourseDetailsByIdAdmin(
      courseId,
    );

    if (!course) {
      throw new ApiException(
        ErrorCodeCourseGet.COURSE_NOT_FOUND,
      );
    }

    return formatAdminCourseGet(course)
  }
}

function formatCourseResponse(course: CourseRepositoryModelPublic): GetCourseResponse {

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

function formatAdminCourseGet(course: CourseRepositoryModelAdmin): GetCourseAdminResponse {
  const fd = (time: Temporal.Instant) => formatDate(time, course.timeZone)
    
  return {
    id: course.id,
    name: course.title,
    description: course.description,
    schedule: {
      startTime: fd(course.startsAt),
      endTime: fd(course.endsAt),
      timeZone: course.timeZone,
    },
    status: {
      name: course.statuses[0].name,
      changedAt: fd(course.statuses[0].changedAt)
    },
    prices: course.prices.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency: price.currency,
      effectiveAt: fd(price.effectiveAt),
    })),
    enrollments: course.enrollments.map((enrollment) => {

      const cust = enrollment.customer
      const paym = enrollment.payment

      return {
      customer: {
            id: cust.id,
            name: cust.name,
            email: cust.email
          },
          payment: {
            status: paym.status,
            amount: paym.amount,
            paidAt: fd(paym.paidAt)
          }
        }
    })
  };
}

function validatePublicCourse(course: CourseRepositoryModelPublic | null): asserts course is CourseRepositoryModelPublic {

  if (!course || !course.prices.length) {
    throw new ApiException(
      ErrorCodeCourseGet.COURSE_NOT_FOUND,
    );
  }
}