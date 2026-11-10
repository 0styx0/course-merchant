import { apiBaseUrl } from "./lib/api/config/api-config";
import { contactEmail } from "./lib/site-config/contact-email";

export async function registerNode() {
  exitIfSettingInvalid(apiBaseUrl);
  exitIfSettingInvalid(contactEmail);

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
function exitIfSettingInvalid(readSetting: () => string) {
  try {
    readSetting();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
