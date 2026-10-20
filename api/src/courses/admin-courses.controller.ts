import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { CreateCourseRequest, GetCourseAdminResponse, ListCoursesAdminResponse } from 'types.js';
import { ParseCourseIdPipe } from './pipes/parse-course-id.pipe.js';
import { AdminCoursesService } from './admin-courses.service.js';
import { ZodValidationPipe } from './pipes/create-course-validation.pipe.js';
import { createCourseRequestSchema } from './validation/course-request-schemas.js';

@Controller({
    path: "admin/courses",
    version: "1",
})
export class AdminCoursesController {
    constructor(
        @Inject(AdminCoursesService)
        private readonly adminCoursesService: AdminCoursesService,
    ) { }

    @Get()
    findAllAdmin(): Promise<ListCoursesAdminResponse> {
        return this.adminCoursesService.findAllAdmin();
    }

    @Get(":courseId")
    findByIdAdmin(
        @Param("courseId", ParseCourseIdPipe) courseId: string
    ): Promise<GetCourseAdminResponse> {
        return this.adminCoursesService.findByIdAdmin(courseId);
    }

    @Post()
    createCourse(
        @Body(new ZodValidationPipe(createCourseRequestSchema))
        request: CreateCourseRequest,
    ): Promise<GetCourseAdminResponse> {
        return this.adminCoursesService.createCourse(request);
    }
}
