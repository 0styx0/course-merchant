import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckEmailNotice } from "./check-email-notice";

describe("CheckEmailNotice", () => {
  it("names the address the link went to", () => {
    render(<CheckEmailNotice email="ami@example.com" />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Check your email");
    expect(notice).toHaveTextContent(
      "We've sent access to ami@example.com. It can take a few minutes. If it hasn't arrived, look in spam.",
    );
  });

  it("takes focus from a script through its ref", () => {
    let noticeElement: HTMLDivElement | null = null;
    render(
      <CheckEmailNotice
        email="ami@example.com"
        ref={(element) => {
          noticeElement = element;
        }}
      />,
    );

    noticeElement!.focus();

    expect(screen.getByRole("status")).toHaveFocus();
  });
});
