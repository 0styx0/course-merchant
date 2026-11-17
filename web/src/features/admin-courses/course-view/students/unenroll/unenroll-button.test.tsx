import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adminCourseWithEveryStudentCase } from "@/mocks/fixtures/admin-courses";

import { UnenrollButton } from "./unenroll-button";
import { unenrollStudentAction } from "./unenroll-student.action";

vi.mock("./unenroll-student.action", () => ({
  unenrollStudentAction: vi.fn(),
}));

const unenrollAction = vi.mocked(unenrollStudentAction);
const courseId = adminCourseWithEveryStudentCase.id;

function enrollmentNamed(name: string) {
  const enrollment = adminCourseWithEveryStudentCase.enrollments.find(
    (candidate) => candidate.customer.name === name,
  );
  if (enrollment === undefined) throw new Error(`No fixture student ${name}`);
  return enrollment;
}

const dana = enrollmentNamed("Dana Cohen");

// Words found nowhere in the app, so only a pass-through can show them.
const apiProblem = {
  title: "Refusal seen only in this test",
  detail: "Detail seen only in this test.",
  code: "ENROLLMENT_NOT_FOUND",
};

type TestUser = ReturnType<typeof userEvent.setup>;

async function openDanaDialog(user: TestUser) {
  render(<UnenrollButton courseId={courseId} enrollment={dana} />);
  await user.click(
    screen.getByRole("button", { name: "Un-enroll Dana Cohen" }),
  );
  return screen.findByRole("alertdialog", { name: "Un-enroll Dana Cohen?" });
}

function confirmButton() {
  return screen.getByRole("button", { name: "Un-enroll" });
}

function expectDialogClosed() {
  return waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
}

function mockRefusal() {
  unenrollAction.mockResolvedValue({ state: "failure", error: apiProblem });
}

// React holds every transition until all running actions settle, so a call
// left hanging would stall the next test's dialog.
const finishHangingCalls: (() => void)[] = [];

function mockHangingCall() {
  unenrollAction.mockReturnValue(
    new Promise((resolve) =>
      finishHangingCalls.push(() =>
        resolve({ state: "failure", error: apiProblem }),
      ),
    ),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(async () => {
  await act(async () =>
    finishHangingCalls.splice(0).forEach((finish) => finish()),
  );
});

describe("UnenrollButton", () => {
  it("names the student in its accessible name", () => {
    render(<UnenrollButton courseId={courseId} enrollment={dana} />);

    expect(
      screen.getByRole("button", { name: "Un-enroll Dana Cohen" }),
    ).toBeInTheDocument();
  });

  it("draws nothing for an un-enrolled student", () => {
    const { container } = render(
      <UnenrollButton
        courseId={courseId}
        enrollment={enrollmentNamed("Rina Gold")}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("draws the button for a suspended student", () => {
    render(
      <UnenrollButton
        courseId={courseId}
        enrollment={enrollmentNamed("Lee Park")}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Un-enroll Lee Park" }),
    ).toBeInTheDocument();
  });

  it("asks a paid student's admin to refund in Stripe first", async () => {
    const dialog = await openDanaDialog(userEvent.setup());

    expect(dialog).toHaveTextContent("Refund their payment in Stripe first.");
  });

  it("tells a free student's admin only that access ends", async () => {
    const user = userEvent.setup();
    render(
      <UnenrollButton
        courseId={courseId}
        enrollment={enrollmentNamed("Noa Levi")}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Un-enroll Noa Levi" }),
    );

    expect(
      await screen.findByRole("alertdialog", { name: "Un-enroll Noa Levi?" }),
    ).toHaveAccessibleDescription(
      "Un-enrolling removes their access to the course.",
    );
  });

  it("closes on Keep student and sends nothing", async () => {
    const user = userEvent.setup();
    await openDanaDialog(user);

    await user.click(screen.getByRole("button", { name: "Keep student" }));

    await expectDialogClosed();
    expect(unenrollAction).not.toHaveBeenCalled();
  });

  it("closes on Escape and sends nothing", async () => {
    const user = userEvent.setup();
    await openDanaDialog(user);

    await user.keyboard("{Escape}");

    await expectDialogClosed();
    expect(unenrollAction).not.toHaveBeenCalled();
  });

  it("calls the action with the course and customer ids, then closes", async () => {
    const user = userEvent.setup();
    unenrollAction.mockResolvedValue({ state: "success", data: null });
    await openDanaDialog(user);

    await user.click(confirmButton());

    await expectDialogClosed();
    expect(unenrollAction).toHaveBeenCalledExactlyOnceWith(
      courseId,
      dana.customer.id,
    );
  });

  it("stays open, disabled and reading Un-enrolling… while the action runs", async () => {
    const user = userEvent.setup();
    mockHangingCall();
    await openDanaDialog(user);

    await user.click(confirmButton());
    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("button", { name: "Un-enrolling…" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep student" })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps the dialog open with the API's words on a refusal", async () => {
    const user = userEvent.setup();
    mockRefusal();
    const dialog = await openDanaDialog(user);

    await user.click(confirmButton());

    const alert = await screen.findByRole("alert");
    expect(dialog).toContainElement(alert);
    expect(alert).toHaveTextContent(apiProblem.title);
    expect(alert).toHaveTextContent(apiProblem.detail);
  });

  it("clears the old message when the admin confirms again", async () => {
    const user = userEvent.setup();
    mockRefusal();
    await openDanaDialog(user);
    await user.click(confirmButton());
    await screen.findByRole("alert");
    mockHangingCall();

    await user.click(confirmButton());

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("shows its own words when the call throws", async () => {
    const user = userEvent.setup();
    unenrollAction.mockRejectedValue(new Error("network down"));
    await openDanaDialog(user);

    await user.click(confirmButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't un-enroll the student");
    expect(alert).toHaveTextContent(
      "Something went wrong while un-enrolling. Check your connection and try again.",
    );
  });

  it("shows no old message when reopened after a failure", async () => {
    const user = userEvent.setup();
    mockRefusal();
    await openDanaDialog(user);
    await user.click(confirmButton());
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Keep student" }));
    await expectDialogClosed();

    await user.click(
      screen.getByRole("button", { name: "Un-enroll Dana Cohen" }),
    );

    await screen.findByRole("alertdialog");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
