import { render, screen } from "@testing-library/react";
import { connection } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { listCustomersAsAdminHandlers } from "@/mocks/handlers/admin-students/list-customers-as-admin";
import { server } from "@/mocks/server";
import AdminStudentsPage, { metadata } from "./page";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

// `connection()` throws outside a Next request, so the test only watches the call.
vi.mock("next/server", () => ({ connection: vi.fn() }));

async function renderPage() {
  return render(await AdminStudentsPage());
}

describe("AdminStudentsPage", () => {
  it("names the tab Students and asks search engines not to index the page", () => {
    expect(metadata).toEqual({ title: "Students", robots: { index: false } });
  });

  it("counts the students and lists each name over its email in the API's order", async () => {
    server.use(listCustomersAsAdminHandlers.success);

    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Students (5)" }),
    ).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Sam Ortizsam@example.com",
      "Noa Levinoa@example.com",
      "Lee Parklee@example.com",
      "Ben Shawben@example.com",
      "Dana Cohendana@example.com",
    ]);
    expect(screen.queryByText("Tal Ben")).not.toBeInTheDocument();
  });

  it("waits for a request before loading, so the list is never built at deploy", async () => {
    server.use(listCustomersAsAdminHandlers.success);

    await renderPage();

    expect(connection).toHaveBeenCalledOnce();
  });

  it("says no students yet when nobody has enrolled", async () => {
    server.use(listCustomersAsAdminHandlers.empty);

    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Students (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No students yet.")).toBeInTheDocument();
  });

  it("shows the API's title and detail when the load fails", async () => {
    server.use(listCustomersAsAdminHandlers.error);

    await renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Internal server error");
    expect(alert).toHaveTextContent(
      "We couldn't load the students right now. Please try again later.",
    );
  });
});
