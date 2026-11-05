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
  fieldErrors: [],
};

const validationProblem = {
  title: "Validation failed",
  detail: "The request contains 1 invalid field.",
  code: "VALIDATION_FAILED",
};

function makeFieldFailure(
  fieldErrors: { path: string; message: string }[],
): StartCheckoutFormState {
  return {
    state: "failure",
    problem: validationProblem,
    customer: { name: "Ami Cohen", email: "ami@" },
    fieldErrors,
  };
}

const EMAIL_MESSAGE =
  "That email address looks incomplete. It should look like name@example.com.";
const NAME_MESSAGE = "Enter your name.";

const emailError = {
  path: "customer.email",
  message: EMAIL_MESSAGE,
};
const nameError = {
  path: "customer.name",
  message: NAME_MESSAGE,
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

  it("shows the email message under Email and links it to the box", async () => {
    sendAction.mockResolvedValue(makeFieldFailure([emailError]));
    const user = await openFields();

    await submitTypedDetails(user);

    const email = await screen.findByLabelText("Email");
    await waitFor(() => expect(email).toBeInvalid());
    expect(email).toHaveAccessibleDescription(
      `We send the course link to this address. ${EMAIL_MESSAGE}`,
    );
    expect(screen.getByLabelText("Name")).toBeValid();
  });

  it("shows the name message under Name", async () => {
    sendAction.mockResolvedValue(makeFieldFailure([nameError]));
    const user = await openFields();

    await submitTypedDetails(user);

    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toBeInvalid());
    expect(name).toHaveAccessibleDescription(NAME_MESSAGE);
  });

  it("shows both messages and focuses Name when both boxes are wrong", async () => {
    sendAction.mockResolvedValue(makeFieldFailure([nameError, emailError]));
    const user = await openFields();

    await submitTypedDetails(user);

    expect(await screen.findByText(NAME_MESSAGE)).toBeVisible();
    expect(screen.getByText(EMAIL_MESSAGE)).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveFocus());
  });

  it("focuses the first wrong box when only Email is wrong", async () => {
    sendAction.mockResolvedValue(makeFieldFailure([emailError]));
    const user = await openFields();

    await submitTypedDetails(user);

    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
  });

  it("keeps the typed values beside a field message", async () => {
    sendAction.mockResolvedValue(makeFieldFailure([emailError]));
    const user = await openFields();

    await submitTypedDetails(user);

    await screen.findByText(EMAIL_MESSAGE);
    expect(screen.getByLabelText("Name")).toHaveValue("Ami Cohen");
    expect(screen.getByLabelText("Email")).toHaveValue("ami@");
  });

  it("shows no field message for a problem without field errors", async () => {
    sendAction.mockResolvedValue(refused);
    const user = await openFields();

    await submitTypedDetails(user);

    await screen.findByRole("alert");
    expect(screen.getByLabelText("Name")).toBeValid();
    expect(screen.getByLabelText("Email")).toBeValid();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("hides the old messages while the next send runs", async () => {
    sendAction.mockResolvedValueOnce(makeFieldFailure([emailError]));
    const user = await openFields();
    await submitTypedDetails(user);
    await screen.findByText(EMAIL_MESSAGE);
    const finishAction = holdAction();

    await user.click(screen.getByRole("button", { name: "Email me the link" }));

    await screen.findByRole("button", { name: "Sending…" });
    expect(screen.queryByText(EMAIL_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeValid();
    await finishAction();
  });

  it("sends an empty form to the action", async () => {
    sendAction.mockResolvedValue(sent);
    const user = await openFields();

    await user.click(screen.getByRole("button", { name: "Email me the link" }));

    await screen.findByRole("status");
    const [, , formData] = sendAction.mock.calls[0];
    expect(formData.get("customer.name")).toBe("");
    expect(formData.get("customer.email")).toBe("");
  });
});
