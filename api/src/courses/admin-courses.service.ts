import { Inject, Injectable } from "@nestjs/common";
import { GetCourseAdminResponse, ListCoursesAdminResponse } from "types.js";
import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";
import { toAdminCourseResponse } from "./courses.mapper.js";
import { AdminCoursesRepository } from "./courses.repository/admin-courses.repository.js";

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
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
