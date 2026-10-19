import { Inject, Injectable } from "@nestjs/common";
import { GetCourseAdminResponse, ListCoursesAdminResponse } from "types.js";
import { CoursesRepository } from "./courses.repository/courses.repository.js";
import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";
import { toAdminCourseResponse } from "./courses.mapper.js";

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
  ) { }

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
