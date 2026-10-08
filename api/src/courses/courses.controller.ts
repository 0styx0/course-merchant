import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetCourseResponse, ListCoursesResponse } from 'types.js';
import { CoursesService } from './courses.service.js';
import { ApiException } from '../common/errors/api.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';

@Controller({
    path: "courses",
    version: "1",
  })
export class CoursesController {
  constructor(
    @Inject(CoursesService)
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  findAll(): Promise<ListCoursesResponse> {
    return this.coursesService.findAll();
  }
  
  @Get(":courseId")
  findById(
    @Param(
      "courseId",
      new ParseUUIDPipe({
        exceptionFactory: () => new ApiException(ErrorCode.INVALID_COURSE_ID),
      }),
    ) courseId: string
  ): Promise<GetCourseResponse> {
    return this.coursesService.findById(courseId);
  }
}
