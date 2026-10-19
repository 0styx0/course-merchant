import { Controller, Get, Inject, Param } from '@nestjs/common';
import { GetCourseAdminResponse } from 'types.js';
import { ParseCourseIdPipe } from './pipes/parse-course-id.pipe.js';
import { AdminCoursesService } from './admin-courses.service.js';

@Controller({
  path: "admin/courses",
  version: "1",
})
export class AdminCoursesController {
  constructor(
    @Inject(AdminCoursesService)
    private readonly adminCoursesService: AdminCoursesService,
  ) { }

  @Get(":courseId")
  findByIdAdmin(
      @Param("courseId", ParseCourseIdPipe) courseId: string
  ): Promise<GetCourseAdminResponse> {
    return this.adminCoursesService.findByIdAdmin(courseId);
  }
}
