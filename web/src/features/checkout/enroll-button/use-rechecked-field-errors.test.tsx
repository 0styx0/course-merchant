import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { FormFieldError } from "@/lib/api/form-errors";
import { useRecheckedFieldErrors } from "./use-rechecked-field-errors";

const EMAIL_MESSAGE =
  "That email address looks incomplete. It should look like name@example.com.";
const NAME_MESSAGE = "Enter your name.";
const nameError = { path: "customer.name", message: NAME_MESSAGE };
const emailError = { path: "customer.email", message: EMAIL_MESSAGE };
const API_EMAIL_MESSAGE = "The API does not accept this address.";

function RecheckHarness({ errorsAtSend }: { errorsAtSend: FormFieldError[] }) {
  const { shownErrors, recheckEditedBox } =
    useRecheckedFieldErrors(errorsAtSend);
  return (
    <form onInput={recheckEditedBox}>
      <input aria-label="Name" name="customer.name" />
      <input aria-label="Email" name="customer.email" />
      <ul aria-label="Shown messages">
        {shownErrors.map(({ path, message }) => (
          <li key={path}>{message}</li>
        ))}
      </ul>
    </form>
  );
}

function renderHarness(errorsAtSend: FormFieldError[]) {
  const view = render(<RecheckHarness errorsAtSend={errorsAtSend} />);
  return {
    user: userEvent.setup(),
    sendAgain: (nextErrors: FormFieldError[]) =>
      view.rerender(<RecheckHarness errorsAtSend={nextErrors} />),
  };
}

describe("useRecheckedFieldErrors", () => {
  it("shows the sent messages until a box is edited", () => {
    renderHarness([nameError, emailError]);

    expect(screen.getByText(NAME_MESSAGE)).toBeVisible();
    expect(screen.getByText(EMAIL_MESSAGE)).toBeVisible();
  });

  it("updates the message of a box that had one while the visitor types", async () => {
    const { user } = renderHarness([nameError]);

    await user.type(screen.getByLabelText("Name"), "a".repeat(101));

    expect(
      screen.getByText(/That name is too long\. Use 100 characters or fewer\./),
    ).toBeVisible();
    expect(screen.queryByText(NAME_MESSAGE)).toBeNull();
  });

  it("drops the message once the value passes", async () => {
    const { user } = renderHarness([emailError]);
    expect(screen.getByText(EMAIL_MESSAGE)).toBeVisible();

    await user.type(screen.getByLabelText("Email"), "ami@example.com");

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("brings the name message back when the visitor empties Name again", async () => {
    const { user } = renderHarness([nameError]);
    await user.type(screen.getByLabelText("Name"), "A");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    await user.clear(screen.getByLabelText("Name"));

    expect(screen.getByText(NAME_MESSAGE)).toBeVisible();
  });

  it("keeps a box without a message quiet while the visitor types a wrong value", async () => {
    const { user } = renderHarness([nameError]);

    await user.type(screen.getByLabelText("Email"), "ami@");

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(NAME_MESSAGE)).toBeVisible();
    expect(screen.queryByText(EMAIL_MESSAGE)).toBeNull();
  });

  it("leaves Name's message in place while the visitor fixes Email", async () => {
    const { user } = renderHarness([nameError, emailError]);

    await user.type(screen.getByLabelText("Email"), "ami@example.com");

    expect(screen.getByText(NAME_MESSAGE)).toBeVisible();
    expect(screen.queryByText(EMAIL_MESSAGE)).toBeNull();
  });

  it("starts from the new messages when a new send hands over a new list", async () => {
    const { user, sendAgain } = renderHarness([emailError]);
    await user.type(screen.getByLabelText("Email"), "ami@example.com");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    sendAgain([emailError]);

    expect(screen.getByText(EMAIL_MESSAGE)).toBeVisible();
  });

  it("keeps an API message the browser check passes until the first input in that box", async () => {
    const { user } = renderHarness([
      { path: "customer.email", message: API_EMAIL_MESSAGE },
    ]);
    expect(screen.getByText(API_EMAIL_MESSAGE)).toBeVisible();

    await user.type(screen.getByLabelText("Email"), "a");

    expect(screen.queryByText(API_EMAIL_MESSAGE)).toBeNull();
  });

  it("shows the browser's message for a refused value after the API message went", async () => {
    const { user } = renderHarness([
      { path: "customer.email", message: API_EMAIL_MESSAGE },
    ]);

    await user.type(screen.getByLabelText("Email"), "ami@");

    expect(screen.getByText(EMAIL_MESSAGE)).toBeVisible();
    expect(screen.queryByText(API_EMAIL_MESSAGE)).toBeNull();
  });
});
