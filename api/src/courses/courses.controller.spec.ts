import { beforeEach, describe, expect, it, vi } from "vitest";

import { CoursesController } from "./courses.controller.js";
import { CoursesService } from "./courses.service.js";

describe("CoursesController", () => {
  let controller: CoursesController;
  let coursesService: {
    findAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    coursesService = {
      findAll: vi.fn(),
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
            name: "React Fundamentals",
            description: "Learn React",
            enrollmentCount: 12,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00.000Z",
              endTime: "2026-10-01T20:00:00.000Z",
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
});
