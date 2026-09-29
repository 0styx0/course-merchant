import { Controller, Get, Inject } from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { ListCoursesResponse } from 'types.js';

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
}
