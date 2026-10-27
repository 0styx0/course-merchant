import {
  afterEach,
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

  beforeEach(() => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("API_MOCKING", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stops the server when API_BASE_URL is invalid", async () => {
    vi.stubEnv("API_BASE_URL", "nope");
    const register = await freshRegister();

    await register();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("starts when API_BASE_URL is valid", async () => {
    const register = await freshRegister();

    await register();

    expect(exit).not.toHaveBeenCalled();
  });
});
