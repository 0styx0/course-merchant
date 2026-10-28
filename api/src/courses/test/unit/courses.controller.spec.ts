import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetCourseResponse } from "types.js";
import { asDependency, type MockMethods } from "@/test/test-helpers.js";
import { CoursesController } from "../../courses.controller.js";
import { CoursesService } from "../../courses.service.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

function makeCourseResponse(courseId: string): GetCourseResponse {
  return {
    id: courseId,
    name: "React Fundamentals",
    summary: "Learn React",
    description: descriptionDoc("Learn React"),
    enrollmentCount: 12,
    image: { version: "1790856000000" },
    price: {
      amount: 9900,
      currency: "USD",
    },
    schedule: {
      startTime: "2026-10-01T18:00:00Z",
      endTime: "2026-10-01T20:00:00Z",
      timeZone: "America/New_York",
    },
  };
}

describe("CoursesController", () => {
  let controller: CoursesController;
  let coursesService: MockMethods<CoursesService, "findAll" | "findById">;

  beforeEach(() => {
    coursesService = {
      findAll: vi.fn<CoursesService["findAll"]>(),
      findById: vi.fn<CoursesService["findById"]>(),
    };

    controller = new CoursesController(
      asDependency<CoursesService>(coursesService),
    );
  });

  describe("findAll", () => {
    it("delegates to CoursesService.findAll", async () => {
      coursesService.findAll.mockResolvedValue({
        courses: [],
      });

      await controller.findAll();

      expect(coursesService.findAll).toHaveBeenCalledOnce();
    });

    it("returns the result from CoursesService.findAll", async () => {
      const response = {
        courses: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "React Fundamentals",
            summary: "Learn React",
            description: descriptionDoc("Learn React"),
            enrollmentCount: 12,
            image: { version: "1790856000000" },
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00Z",
              endTime: "2026-10-01T20:00:00Z",
              timeZone: "America/New_York",
            },
          },
        ],
      };

      coursesService.findAll.mockResolvedValue(response);

      await expect(controller.findAll()).resolves.toEqual(response);
    });

    it("propagates errors from CoursesService.findAll", async () => {
      const error = new Error("database unavailable");

      coursesService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(
        "database unavailable",
      );
    });
  });

  describe("findById", () => {
    it("delegates to CoursesService.findById with the course ID", async () => {
      const courseId = "550e8400-e29b-41d4-a716-446655440000";

      coursesService.findById.mockResolvedValue(makeCourseResponse(courseId));

      await controller.findById(courseId);

      expect(coursesService.findById).toHaveBeenCalledWith(courseId);
      expect(coursesService.findById).toHaveBeenCalledOnce();
    });

    it("returns the result from CoursesService.findById", async () => {
      const courseId = "550e8400-e29b-41d4-a716-446655440000";
      const response = makeCourseResponse(courseId);

      coursesService.findById.mockResolvedValue(response);

      await expect(controller.findById(courseId)).resolves.toEqual(response);
    });

    it("propagates errors from CoursesService.findById", async () => {
      const error = new Error("course not found");

      coursesService.findById.mockRejectedValue(error);

      await expect(
        controller.findById("550e8400-e29b-41d4-a716-446655440000"),
      ).rejects.toThrow("course not found");
    });
  });
});
