import {
  Controller,
  Get,
  Inject,
  Param,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { GetCourseResponse, ListCoursesResponse } from "types.js";
import { Public } from "@/auth/public.decorator.js";
import { CoursesService } from "./courses.service.js";
import { ParseCourseIdPipe } from "./pipes/parse-course-id.pipe.js";

@Public()
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
    @Param("courseId", ParseCourseIdPipe) courseId: string,
  ): Promise<GetCourseResponse> {
    return this.coursesService.findById(courseId);
  }

  @Get(":courseId/image/:version")
  async findImage(
    @Param("courseId", ParseCourseIdPipe) courseId: string,
    @Param("version") version: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const bytes = await this.coursesService.findImageBytes(courseId, version);

    // set only once the image is found (`@Header` would also stamp a 404), and
    // safe for a year because the version is in the URL
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    return new StreamableFile(bytes, { type: "image/webp" });
  }
}
