import { Inject, Injectable } from "@nestjs/common";
import { ListCoursesResponse } from "types.js";
import { CoursesRepository } from "./courses.repository/courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";


@Injectable()
export class CoursesService {
  constructor(
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
  ) {}

  async findAll(): Promise<ListCoursesResponse> {
    const courses = await this.coursesRepository.findAvailable(Temporal.Now.instant());

    return {
      courses: courses.map((course) => {
        const [price] = course.prices;

        if (!price) {
          throw new Error(
            `Course has no currently effective price: ${course.id}`,
          );
        }

        return {
          name: course.title,
          description: course.description,
          enrollmentCount: course.enrollments,
          price: {
            amount: price.amount,
            currency: price.currency,
          },
          schedule: {
            startTime: course.startsAt.toString(),
            endTime: course.endsAt.toString(),
            timeZone: course.timeZone,
          },
        };
      }),
    };
  }
}