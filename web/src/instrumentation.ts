export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  await checkApiBaseUrl();

  if (process.env.API_MOCKING === "enabled") {
    const { server } = await import("./mocks/node");
    server.listen({ onUnhandledRequest: "bypass" });
    console.log("[msw] server-side mocking enabled");
  }
}

/**
 * A throw here only logs "Failed to prepare server" and every request then
 * fails, so a bad setting stops the server instead.
 */
async function checkApiBaseUrl() {
  const { apiBaseUrl } = await import("./lib/api/api-config");
  try {
    apiBaseUrl();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
