import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "./start-checkout.action";
import { EnrollButton } from "./enroll-button";

vi.mock("./start-checkout.action", () => ({ startCheckoutAction: vi.fn() }));

const sendAction = vi.mocked(startCheckoutAction);
const courseId = "11111111-1111-4111-8111-111111111111";

const sent: StartCheckoutFormState = {
  state: "success",
  customer: { email: "ami@example.com" },
};

const refused: StartCheckoutFormState = {
  state: "failure",
  problem: {
    title: "Course not purchasable",
    detail: "This course has ended and can no longer be bought.",
    code: "COURSE_NOT_PURCHASABLE",
  },
  customer: { name: "Ami Cohen", email: "ami@example.com" },
};

/**
 * An action that stays pending until the test finishes it. React runs async
 * actions one after another across roots, so a pending one that never ends
 * would block every later test.
 */
function holdAction() {
  let finish: () => void = () => {};
  sendAction.mockReturnValue(
    new Promise((resolve) => {
      finish = () => resolve(sent);
    }),
  );
  return async () => {
    finish();
    await screen.findByRole("status");
  };
}

/** Records the browser's `invalid` event, which fires when a submit finds the box failing its checks. */
function watchInvalidEvent(box: HTMLElement) {
  const onInvalid = vi.fn();
  box.addEventListener("invalid", onInvalid);
  return onInvalid;
}

async function openFields() {
  const user = userEvent.setup();
  render(<EnrollButton courseId={courseId} />);
  await user.click(screen.getByRole("button", { name: "Enroll for free" }));
  return user;
}

async function submitTypedDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ami Cohen");
  await user.type(screen.getByLabelText("Email"), "ami@example.com");
  await user.click(screen.getByRole("button", { name: "Email me the link" }));
}

describe("EnrollButton", () => {
  beforeEach(() => {
    sendAction.mockReset();
  });

  it("starts as a closed button", () => {
    render(<EnrollButton courseId={courseId} />);

    const button = screen.getByRole("button", { name: "Enroll for free" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("type", "button");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("opens the fields in place and focuses Name", async () => {
    await openFields();

    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAccessibleDescription(
      "We send the course link to this address.",
    );
    expect(
      screen.getByRole("button", { name: "Email me the link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enroll for free" }),
    ).not.toBeInTheDocument();
  });

  it("shows Sending… and read-only fields while the action runs", async () => {
    const finishAction = holdAction();
    const user = await openFields();

    await submitTypedDetails(user);

    const button = await screen.findByRole("button", { name: "Sending…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Name")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    await finishAction();
  });

  it("sends one request when the button is pressed twice", async () => {
    const finishAction = holdAction();
    const user = await openFields();
    await submitTypedDetails(user);

    await user.click(await screen.findByRole("button", { name: "Sending…" }));
    await user.click(screen.getByRole("button", { name: "Sending…" }));

    // React queues a second submit behind the first, so it would run now.
    await finishAction();
    expect(sendAction).toHaveBeenCalledOnce();
  });

  it("sends the course id and both typed values", async () => {
    sendAction.mockResolvedValue(sent);
    const user = await openFields();

    await submitTypedDetails(user);

    const [boundCourseId, , formData] = sendAction.mock.calls[0];
    expect(boundCourseId).toBe(courseId);
    expect(formData.get("customer.name")).toBe("Ami Cohen");
    expect(formData.get("customer.email")).toBe("ami@example.com");
  });

  it("replaces the fields with the notice and focuses it", async () => {
    sendAction.mockResolvedValue(sent);
    const user = await openFields();

    await submitTypedDetails(user);

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("We've sent access to ami@example.com.");
    await waitFor(() => expect(notice).toHaveFocus());
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the problem above the fields and keeps both values", async () => {
    sendAction.mockResolvedValue(refused);
    const user = await openFields();

    await submitTypedDetails(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Course not purchasable");
    expect(alert).toHaveTextContent(
      "This course has ended and can no longer be bought.",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Ami Cohen");
    expect(screen.getByLabelText("Email")).toHaveValue("ami@example.com");
  });

  it("sends again after a problem", async () => {
    sendAction.mockResolvedValueOnce(refused).mockResolvedValueOnce(sent);
    const user = await openFields();
    await submitTypedDetails(user);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Email me the link" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(sendAction).toHaveBeenCalledTimes(2);
  });

  it("sends no request when the name is empty", async () => {
    const user = await openFields();
    await user.type(screen.getByLabelText("Email"), "ami@example.com");
    const nameInvalid = watchInvalidEvent(screen.getByLabelText("Name"));

    await user.click(screen.getByRole("button", { name: "Email me the link" }));

    expect(nameInvalid).toHaveBeenCalledOnce();
    expect(sendAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toBeInvalid();
  });

  it("sends no request when the email is malformed", async () => {
    const user = await openFields();
    await user.type(screen.getByLabelText("Name"), "Ami Cohen");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    const emailInvalid = watchInvalidEvent(screen.getByLabelText("Email"));

    await user.click(screen.getByRole("button", { name: "Email me the link" }));

    expect(emailInvalid).toHaveBeenCalledOnce();
    expect(sendAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toBeInvalid();
  });
});
