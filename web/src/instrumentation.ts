/**
 * Next builds this file for the Edge runtime too, and warns about Node-only
 * code it can see there, so the Node-only startup lives in its own file.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
