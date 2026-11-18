import { render, screen, within } from "@testing-library/react";
import { connection } from "next/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { adminCustomers } from "@/mocks/fixtures/admin-students";
import type { AdminCustomer } from "@/lib/types";
import { listCustomersAsAdminHandlers } from "@/mocks/handlers/admin-students/list-customers-as-admin";
import { MOCK_API_BASE_URL } from "@/mocks/mock-api";
import { server } from "@/mocks/server";
import AdminStudentsPage, { metadata } from "./page";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

// `connection()` throws outside a Next request, so the test only watches the call.
vi.mock("next/server", () => ({ connection: vi.fn() }));

function answerWithCustomers(customers: readonly AdminCustomer[]) {
  server.use(
    http.get(`${MOCK_API_BASE_URL}/v1/admin/customers`, () =>
      HttpResponse.json({ customers }),
    ),
  );
}

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
    const studentList = screen.getByRole("list", { name: "Students (5)" });
    const rows = within(studentList).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Sam Ortizsam@example.com",
      "Noa Levinoa@example.com",
      "Lee Parklee@example.com",
      "Ben Shawben@example.com",
      "Dana Cohendana@example.com",
    ]);
    expect(within(studentList).queryByText("Tal Ben")).not.toBeInTheDocument();
  });

  it("lists the customers who never paid under the students, dated in the browser's zone", async () => {
    server.use(listCustomersAsAdminHandlers.success);

    await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Unfinished checkouts (1)",
      }),
    ).toBeInTheDocument();
    const unfinishedList = screen.getByRole("list", {
      name: "Unfinished checkouts (1)",
    });
    // Tal's 2026-11-03T16:00:00Z is Nov 4 in Pacific/Chatham, the test zone.
    expect(
      within(unfinishedList)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["Tal Ben · tal@example.com · Nov 4, 2026"]);
  });

  it("hides the unfinished checkouts when every customer is a student", async () => {
    answerWithCustomers(
      adminCustomers.filter((customer) => customer.enrollments.length > 0),
    );

    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Students (5)" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows the unfinished checkouts below No students yet, newest checkout first", async () => {
    const tal = adminCustomers.filter(
      (customer) => customer.enrollments.length === 0,
    );
    const olderCheckout = {
      ...tal[0],
      id: "9a7c1e3b-5d80-4fc6-8b79-1c3e5a7b9db7",
      name: "Moe Gold",
      email: "moe@example.com",
      latestCheckoutStartedAt: "2026-10-01T09:00:00Z",
    };
    answerWithCustomers([olderCheckout, ...tal]);

    await renderPage();

    expect(screen.getByText("No students yet.")).toBeInTheDocument();
    const unfinishedList = screen.getByRole("list", {
      name: "Unfinished checkouts (2)",
    });
    expect(
      within(unfinishedList)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual([
      "Tal Ben · tal@example.com · Nov 4, 2026",
      "Moe Gold · moe@example.com · Oct 1, 2026",
    ]);
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
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
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
