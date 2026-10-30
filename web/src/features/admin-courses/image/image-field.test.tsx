import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { courseImageSchema, type ChosenImage } from "./course-image";
import { ImageField } from "./image-field";

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

beforeEach(() => {
  let count = 0;
  createObjectURL.mockImplementation(() => `blob:preview-${++count}`);
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL }),
  );
  stubBitmap(1600, 900);
});

afterEach(() => {
  vi.unstubAllGlobals();
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
});

function stubBitmap(width: number, height: number) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width, height, close: vi.fn() }),
  );
}

function fileOf(type: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], "photo", { type });
}

// Stands in for the form: holds the value and runs the rule for the error.
function Harness({ onChange }: { onChange?: (image: ChosenImage) => void }) {
  const [value, setValue] = useState<ChosenImage | null>(null);
  const result = value && courseImageSchema.safeParse(value);
  const error =
    result && !result.success ? result.error.issues[0].message : undefined;
  return (
    <ImageField
      value={value}
      onChange={(image) => {
        setValue(image);
        onChange?.(image);
      }}
      onBlur={vi.fn()}
      fieldRef={vi.fn()}
      error={error}
      touched
      submitted={false}
    />
  );
}

async function choose(file: File) {
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(screen.getByLabelText("Image"), file);
}

describe("ImageField", () => {
  it("shows no preview before a file is chosen", () => {
    render(<Harness />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("measures the chosen file, reports it and shows a preview", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const file = fileOf("image/png");

    await choose(file);

    expect(
      await screen.findByRole("img", { name: "Preview of the chosen image" }),
    ).toHaveAttribute("src", "blob:preview-1");
    expect(onChange).toHaveBeenCalledWith({ file, width: 1600, height: 900 });
  });

  it.each([
    [
      "the wrong type",
      () => fileOf("image/gif"),
      "The image must be a JPEG, PNG or WebP file.",
    ],
    [
      "over 5 MB",
      () => fileOf("image/png", 5 * 1024 * 1024 + 1),
      "The image must be 5 MB or smaller.",
    ],
  ])("shows its own message for %s", async (_name, makeFile, message) => {
    render(<Harness />);
    await choose(makeFile());
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("shows its own message for an image under 800 × 450", async () => {
    stubBitmap(799, 450);
    render(<Harness />);
    await choose(fileOf("image/png"));
    expect(
      await screen.findByText("The image must be at least 800 × 450 pixels."),
    ).toBeInTheDocument();
  });

  it("shows its own message for an image over 25 megapixels", async () => {
    stubBitmap(6000, 4500);
    render(<Harness />);
    await choose(fileOf("image/png"));
    expect(
      await screen.findByText("The image must be 25 megapixels or fewer."),
    ).toBeInTheDocument();
  });

  it("shows its own message for an unreadable file, with no preview", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error()));
    render(<Harness />);
    await choose(fileOf("image/png"));
    expect(
      await screen.findByText(
        "This file couldn't be read as an image. Choose another.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps the preview of a refused file beside its message", async () => {
    stubBitmap(100, 100);
    render(<Harness />);
    await choose(fileOf("image/png"));
    await screen.findByText("The image must be at least 800 × 450 pixels.");
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("revokes the old object URL when the file changes", async () => {
    render(<Harness />);
    await choose(fileOf("image/png"));
    await screen.findByRole("img");
    await choose(fileOf("image/jpeg"));

    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1"),
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview-2");
  });

  it("revokes the object URL on unmount", async () => {
    const { unmount } = render(<Harness />);
    await choose(fileOf("image/png"));
    await screen.findByRole("img");

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("ignores a slow measure of an older file when a newer one was chosen", async () => {
    let finishFirst: (bitmap: object) => void = () => {};
    const bitmap = { width: 1600, height: 900, close: vi.fn() };
    vi.stubGlobal(
      "createImageBitmap",
      vi
        .fn()
        .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
        .mockResolvedValueOnce(bitmap),
    );
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const second = fileOf("image/jpeg");

    await choose(fileOf("image/png"));
    await choose(second);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    finishFirst(bitmap);
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      file: second,
      width: 1600,
      height: 900,
    });
  });
});
