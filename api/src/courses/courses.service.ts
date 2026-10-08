import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { errorResponse, GetCourseResponse, ListCoursesResponse } from "types.js";
import { CoursesRepository } from "./courses.repository/courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";
import { formatDate } from "../utils/formatters.js";

@Injectable()
export class CoursesService {
  constructor(
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
  ) { }

  async findAll(): Promise<ListCoursesResponse> {
    // TODO: fix
    const courses = await this.coursesRepository.findAvailable(Temporal.Now.instant());

    // if (!courses) {
    //   throw new NotFoundException({
    //     message: "Course not found",
    //     code: "COURSE_NOT_FOUND",
    //   } as errorResponse) ;
    // }

    return {
      courses: courses.map((course) => {
        const [price] = course.prices;

        if (!price) {
          throw new Error(
            `Course has no currently effective price: ${course.id}`,
          );
        }

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

    if (!course) {
      throw new NotFoundException({
        message: "Course not found",
        code: "COURSE_NOT_FOUND",
      } as errorResponse) ;
    }

    return {
      id: course.id,
      name: course.title,
      description: course.description,
      enrollmentCount: course.enrollments,
      price: {
        amount: course.prices[0].amount,
        currency: course.prices[0].currency,
      },
      schedule: {
        startTime: formatDate(course.startsAt, course.timeZone),
        endTime: formatDate(course.endsAt, course.timeZone),
        timeZone: course.timeZone,
      },
    };
  }
}