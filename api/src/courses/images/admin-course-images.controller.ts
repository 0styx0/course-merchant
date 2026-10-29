import {
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { AdminCourseImagesService } from "./admin-course-images.service.js";
import { CourseImageUploadInterceptor } from "./course-image-upload.interceptor.js";
import { ParseCourseIdPipe } from "../pipes/parse-course-id.pipe.js";

@Controller({
  path: "admin/courses",
  version: "1",
})
export class AdminCourseImagesController {
  constructor(
    @Inject(AdminCourseImagesService)
    private readonly imagesService: AdminCourseImagesService,
  ) {}

  @Put(":courseId/image")
  @HttpCode(204)
  @UseInterceptors(CourseImageUploadInterceptor)
  async uploadImage(
    @Param("courseId", ParseCourseIdPipe) courseId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<void> {
    await this.imagesService.uploadImage(courseId, file?.buffer);
  }

  // the admin always sees what is stored
  @Get(":courseId/image")
  @Header("Cache-Control", "private, no-cache")
  async findImage(
    @Param("courseId", ParseCourseIdPipe) courseId: string,
  ): Promise<StreamableFile> {
    const bytes = await this.imagesService.findImageBytes(courseId);

    return new StreamableFile(bytes, { type: "image/webp" });
  }
}
