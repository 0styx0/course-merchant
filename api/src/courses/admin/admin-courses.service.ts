import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCourseRequest,
  DbScope,
  GetCourseAdminResponse,
  ListCoursesAdminResponse,
  UpdateCourseRequest,
} from "types.js";
import {
  CustomerOwedRefund,
  PaymentsRepository,
} from "@/payments/payments.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { courseNotFound } from "../course-errors.js";
import { ValidationException } from "../../common/errors/validation.exception.js";
import {
  toAdminCourseResponse,
  toStoredCourseFields,
  toStoredPrices,
} from "../courses.mapper.js";
import {
  AdminCoursesRepository,
  CourseRepositoryCreateInput,
  CourseRepositoryModelAdmin,
} from "../repositories/admin-courses.repository.js";
import {
  findPriceChanges,
  findUpdateRuleViolations,
  UpdateRuleContext,
} from "../validation/course-update-rules.js";
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

function owedCustomerIdsOf(
  courseId: string,
  customersOwedRefund: CustomerOwedRefund[],
): Set<string> {
  return new Set(
    customersOwedRefund
      .filter((buyer) => buyer.courseId === courseId)
      .map((buyer) => buyer.customerId),
  );
}

@Injectable()
export class AdminCoursesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminCoursesRepository)
    private readonly coursesRepository: AdminCoursesRepository,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
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
    // a new course has no enrollments, so nobody can be owed a refund
    return toAdminCourseResponse(course, new Set());
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

    return this.toAdminResponse(course);
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

    return this.toAdminResponse(course);
  }

  async findAllAdmin(): Promise<ListCoursesAdminResponse> {
    const courses = await this.coursesRepository.findAllCourseDetailsAdmin(
      this.prisma.db,
    );

    return { courses: await this.toAdminResponses(courses) };
  }

  private async toAdminResponse(
    course: CourseRepositoryModelAdmin,
  ): Promise<GetCourseAdminResponse> {
    const [response] = await this.toAdminResponses([course]);

    return response;
  }

  // asks for every course's owed buyers at once, so a list costs one query
  private async toAdminResponses(
    courses: CourseRepositoryModelAdmin[],
  ): Promise<GetCourseAdminResponse[]> {
    const customersOwedRefund =
      await this.paymentsRepository.findCustomersOwedRefund(
        this.prisma.db,
        courses.map((course) => course.id),
      );

    return courses.map((course) =>
      toAdminCourseResponse(
        course,
        owedCustomerIdsOf(course.id, customersOwedRefund),
      ),
    );
  }
}
