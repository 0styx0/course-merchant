import { Controller, Get, Inject, Param } from '@nestjs/common';
import { GetCourseResponse, ListCoursesResponse } from 'types.js';
import { CoursesService } from './courses.service.js';

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
  findOne(
    @Param("courseId") courseId: string,
  ): Promise<GetCourseResponse> {
    return this.coursesService.findById(courseId);
  }
}
