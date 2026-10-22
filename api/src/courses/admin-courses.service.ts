import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCourseRequest,
  GetCourseAdminResponse,
  ListCoursesAdminResponse,
  UpdateCourseRequest,
} from "types.js";
import { courseNotFound } from "./course-errors.js";
import { ValidationException } from "../common/errors/validation.exception.js";
import { toAdminCourseResponse } from "./courses.mapper.js";
import {
  AdminCoursesRepository,
  CourseRepositoryCreateInput,
} from "./courses.repository/admin-courses.repository.js";
import {
  findPriceChanges,
  findUpdateRuleViolations,
} from "./validation/course-update-rules.js";
import { Temporal } from "@js-temporal/polyfill";

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
  ) {}

  async createCourse(
    request: CreateCourseRequest,
  ): Promise<GetCourseAdminResponse> {
    const input: CourseRepositoryCreateInput = {
      title: request.name,
      description: request.description,
      contentUrl: request.contentUrl,
      startsAt: Temporal.Instant.from(request.schedule.startTime),
      endsAt: Temporal.Instant.from(request.schedule.endTime),
      timeZone: request.schedule.timeZone,
      initialStatus: request.status,
      prices: request.prices.map((price) => ({
        amount: price.amount,
        currency: price.currency,
        effectiveAt: Temporal.Instant.from(price.effectiveAt),
      })),
    };

    const course = await this.coursesRepository.createCourse(input);
    return toAdminCourseResponse(course);
  }

  async updateCourse(
    courseId: string,
    request: UpdateCourseRequest,
  ): Promise<GetCourseAdminResponse> {
    const now = Temporal.Now.instant();
    const stored =
      await this.coursesRepository.findCourseDetailsByIdAdmin(courseId);

    if (!stored) {
      throw courseNotFound(courseId);
    }

    const context = { request, stored, now };
    const errors = findUpdateRuleViolations(context);

    if (errors.length > 0) {
      throw new ValidationException(errors);
    }

    const { newPrices, deletePriceIds } = findPriceChanges(context);
    const currentStatus = stored.statuses[0].name;

    const course = await this.coursesRepository.updateCourse(courseId, {
      title: request.name,
      description: request.description,
      contentUrl: request.contentUrl,
      startsAt: Temporal.Instant.from(request.schedule.startTime),
      endsAt: Temporal.Instant.from(request.schedule.endTime),
      timeZone: request.schedule.timeZone,
      nextStatus: request.status === currentStatus ? null : request.status,
      newPrices: newPrices.map((price) => ({
        amount: price.amount,
        currency: price.currency,
        effectiveAt: Temporal.Instant.from(price.effectiveAt),
      })),
      deletePriceIds,
      now,
    });

    if (!course) {
      throw courseNotFound(courseId);
    }

    return toAdminCourseResponse(course);
  }

  async findByIdAdmin(courseId: string): Promise<GetCourseAdminResponse> {
    const course =
      await this.coursesRepository.findCourseDetailsByIdAdmin(courseId);

    if (!course) {
      throw courseNotFound(courseId);
    }

    return toAdminCourseResponse(course);
  }

  async findAllAdmin(): Promise<ListCoursesAdminResponse> {
    const courses = await this.coursesRepository.findAllCourseDetailsAdmin();

    return {
      courses: courses.map(toAdminCourseResponse),
    };
  }
}
