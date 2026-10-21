import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import type { CreateCourseRequest, GetCourseAdminResponse, ListCoursesAdminResponse, UpdateCourseRequest } from 'types.js';
import { ParseCourseIdPipe } from './pipes/parse-course-id.pipe.js';
import { AdminCoursesService } from './admin-courses.service.js';
import { ZodValidationPipe } from './pipes/create-course-validation.pipe.js';
import { createCourseRequestSchema, updateCourseRequestSchema } from './validation/course-request-schemas.js';

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

    @Put(":courseId")
    updateCourse(
        @Param("courseId", ParseCourseIdPipe) courseId: string,
        @Body(new ZodValidationPipe(updateCourseRequestSchema))
        request: UpdateCourseRequest,
    ): Promise<GetCourseAdminResponse> {
        return this.adminCoursesService.updateCourse(courseId, request);
    }
}
