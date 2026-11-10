import {
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

async function freshRegister() {
  vi.resetModules();
  const { register } = await import("./instrumentation");
  return register;
}

describe("register", () => {
  let exit: MockInstance<typeof process.exit>;
  let logError: MockInstance<typeof console.error>;

  beforeEach(() => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("API_MOCKING", "");
    logError = vi.spyOn(console, "error").mockImplementation(() => {});
    exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  it("stops the server when API_BASE_URL is invalid", async () => {
    vi.stubEnv("API_BASE_URL", "nope");
    const register = await freshRegister();

    await register();

    expect(logError).toHaveBeenCalledWith("API_BASE_URL is not a valid URL");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("stops the server with a message when CONTACT_EMAIL is missing", async () => {
    vi.stubEnv("CONTACT_EMAIL", "");
    const register = await freshRegister();

    await register();

    expect(logError).toHaveBeenCalledWith("CONTACT_EMAIL is not configured");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("stops the server with a message when CONTACT_EMAIL is invalid", async () => {
    vi.stubEnv("CONTACT_EMAIL", "nope");
    const register = await freshRegister();

    await register();

    expect(logError).toHaveBeenCalledWith(
      "CONTACT_EMAIL is not a valid email address",
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("starts when API_BASE_URL and CONTACT_EMAIL are valid", async () => {
    const register = await freshRegister();

    await register();

    expect(logError).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});
