import { Inject, Injectable } from "@nestjs/common";
import { CreateCourseRequest, GetCourseAdminResponse, ListCoursesAdminResponse } from "types.js";
import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";
import { toAdminCourseResponse } from "./courses.mapper.js";
import { AdminCoursesRepository, CourseRepositoryCreateInput, CourseRepositoryModelAdmin } from "./courses.repository/admin-courses.repository.js";
import { Temporal } from "@js-temporal/polyfill";

// ask client if they ended up wanting. leaving in for db constraint
const TEMPORARY_CONTENT_URL = "TODO";

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
  ) { }

  createCourse(
    request: CreateCourseRequest,
  ): Promise<CourseRepositoryModelAdmin> {
    const input: CourseRepositoryCreateInput = {
      title: request.name,
      description: request.description,
      contentUrl: TEMPORARY_CONTENT_URL,
      startsAt: Temporal.Instant.from(request.schedule.startTime),
      endsAt: Temporal.Instant.from(request.schedule.endTime),
      timeZone: request.schedule.timeZone,
      initialStatus: request.status,
      prices: request.prices.map((price) => ({
        amount: price.amount,
        currency: price.currency,
        effectiveAt: Temporal.Instant.from(price.effectiveAt),
      })),
    };

    return this.coursesRepository.createCourse(input);
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

    return toAdminCourseResponse(course)
  }

  async findAllAdmin(): Promise<ListCoursesAdminResponse> {
    const courses =
      await this.coursesRepository.findAllCourseDetailsAdmin();
  
    return {
      courses: courses.map(toAdminCourseResponse),
    };
  }
}
