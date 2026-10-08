import { beforeEach, describe, expect, it, vi } from "vitest";

import { CoursesController } from "../../courses.controller.js";
import { CoursesService } from "../../courses.service.js";

describe("CoursesController", () => {
  let controller: CoursesController;
  let coursesService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    coursesService = {
      findAll: vi.fn(),
      findById: vi.fn(),
    };

    controller = new CoursesController(
      coursesService as unknown as CoursesService,
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
            description: "Learn React",
            enrollmentCount: 12,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T14:00:00-04:00",
              endTime: "2026-10-01T16:00:00-04:00",
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

      coursesService.findById.mockResolvedValue({});

      await controller.findById(courseId);

      expect(coursesService.findById).toHaveBeenCalledWith(courseId);
      expect(coursesService.findById).toHaveBeenCalledOnce();
    });

    it("returns the result from CoursesService.findById", async () => {
      const courseId = "550e8400-e29b-41d4-a716-446655440000";
      const response = {
        id: courseId,
        name: "React Fundamentals",
        description: "Learn React",
        enrollmentCount: 12,
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-10-01T14:00:00-04:00",
          endTime: "2026-10-01T16:00:00-04:00",
          timeZone: "America/New_York",
        },
      };

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