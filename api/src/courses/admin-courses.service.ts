import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCourseRequest,
  DbScope,
  GetCourseAdminResponse,
  ListCoursesAdminResponse,
  UpdateCourseRequest,
} from "types.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { courseNotFound } from "./course-errors.js";
import { ValidationException } from "../common/errors/validation.exception.js";
import {
  toAdminCourseResponse,
  toStoredCourseFields,
  toStoredPrices,
} from "./courses.mapper.js";
import {
  AdminCoursesRepository,
  CourseRepositoryCreateInput,
  CourseRepositoryModelAdmin,
} from "./courses.repository/admin-courses.repository.js";
import {
  findPriceChanges,
  findUpdateRuleViolations,
  UpdateRuleContext,
} from "./validation/course-update-rules.js";
import { Temporal } from "@js-temporal/polyfill";

function assertUpdateAllowed(context: UpdateRuleContext): void {
  const errors = findUpdateRuleViolations(context);

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }
}

// only set when the status changed, so the log records real transitions
function nextStatusOf(
  request: UpdateCourseRequest,
  stored: CourseRepositoryModelAdmin,
) {
  const currentStatus = stored.statuses[0].name;

  if (request.status === currentStatus) {
    return null;
  }

  return request.status;
}

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
  ) {}

  async createCourse(
    request: CreateCourseRequest,
  ): Promise<GetCourseAdminResponse> {
    const input: CourseRepositoryCreateInput = {
      ...toStoredCourseFields(request),
      initialStatus: request.status,
      prices: toStoredPrices(request.prices),
    };

    const course = await this.prisma.db.transaction((tx) =>
      this.coursesRepository.createCourse(tx, input),
    );
    return toAdminCourseResponse(course);
  }

  async updateCourse(
    courseId: string,
    request: UpdateCourseRequest,
  ): Promise<GetCourseAdminResponse> {
    const now = Temporal.Now.instant();

    // read, validate and write in one transaction, so the rules are checked
    // against the course as it is when the change is applied
    const course = await this.prisma.db.transaction(async (tx) => {
      const stored = await this.loadStoredOrThrow(tx, courseId);
      const context = { request, stored, now };

      assertUpdateAllowed(context);

      const { newPrices, deletePriceIds } = findPriceChanges(context);

      return this.coursesRepository.updateCourse(tx, courseId, {
        ...toStoredCourseFields(request),
        nextStatus: nextStatusOf(request, stored),
        newPrices: toStoredPrices(newPrices),
        deletePriceIds,
        now,
      });
    });

    if (!course) {
      throw courseNotFound(courseId);
    }

    return toAdminCourseResponse(course);
  }

  private async loadStoredOrThrow(tx: DbScope, courseId: string) {
    const stored = await this.coursesRepository.findCourseDetailsByIdAdmin(
      tx,
      courseId,
    );

    if (!stored) {
      throw courseNotFound(courseId);
    }

    return stored;
  }

  async findByIdAdmin(courseId: string): Promise<GetCourseAdminResponse> {
    const course = await this.coursesRepository.findCourseDetailsByIdAdmin(
      this.prisma.db,
      courseId,
    );

    if (!course) {
      throw courseNotFound(courseId);
    }

    return toAdminCourseResponse(course);
  }

  async findAllAdmin(): Promise<ListCoursesAdminResponse> {
    const courses = await this.coursesRepository.findAllCourseDetailsAdmin(
      this.prisma.db,
    );

    return {
      courses: courses.map(toAdminCourseResponse),
    };
  }
}
