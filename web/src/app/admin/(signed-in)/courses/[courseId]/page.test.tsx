import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithImage,
} from "@/mocks/fixtures/admin-courses";
import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { server } from "@/mocks/server";
import AdminCoursePage, { metadata } from "./page";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";
const courseId = adminCourseWithEnrollment.id;

async function renderPage() {
  const page = await AdminCoursePage({
    params: Promise.resolve({ courseId }),
  });
  return render(page);
}

describe("AdminCoursePage", () => {
  it("names the tab Course details and asks search engines not to index the page", () => {
    expect(metadata).toEqual({
      title: "Course details",
      robots: { index: false },
    });
  });

  it("shows the course and lists its students by name and email", async () => {
    server.use(getCourseAsAdminHandlers.withEnrollment);

    await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: adminCourseWithEnrollment.name,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(adminCourseWithEnrollment.summary),
    ).toBeInTheDocument();
    expect(screen.getByText("Three small apps")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ada Lovelace · ada@example.com · enrolled Oct 16, 2026",
      ),
    ).toBeInTheDocument();
  });

  it("says no students yet when nobody has enrolled", async () => {
    server.use(getCourseAsAdminHandlers.success);

    await renderPage();

    expect(screen.getByText("No students yet.")).toBeInTheDocument();
  });

  it("loads a stored image from the admin image route without Next's resizer", async () => {
    server.use(getCourseAsAdminHandlers.withImage);

    const { container } = await renderPage();

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      `/admin/courses/${courseId}/image?v=${adminCourseWithImage.image.version}`,
    );
  });

  it("shows no image for a course without one", async () => {
    server.use(getCourseAsAdminHandlers.success);

    const { container } = await renderPage();

    expect(container.querySelector("img")).toBeNull();
  });

  it("links the side column to the edit page", async () => {
    server.use(getCourseAsAdminHandlers.success);

    await renderPage();

    expect(screen.getByRole("link", { name: "Edit course" })).toHaveAttribute(
      "href",
      `/admin/courses/${courseId}/edit`,
    );
  });

  it("shows the API's title and detail for any other problem", async () => {
    server.use(getCourseAsAdminHandlers.error);

    await renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Internal server error");
    expect(alert).toHaveTextContent(
      "We couldn't load this course right now. Please try again later.",
    );
  });

  it.each(["notFound", "invalidId"] as const)(
    "shows not-found when the API answers %s",
    async (scenario) => {
      server.use(getCourseAsAdminHandlers[scenario]);

      await expect(renderPage()).rejects.toThrow(NOT_FOUND_DIGEST);
    },
  );
});
