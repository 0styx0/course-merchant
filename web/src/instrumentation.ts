export async function register() {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
  
    if (process.env.NEXT_RUNTIME !== "nodejs") {
      return;
    }
  
    const { server } = await import("./mocks/node");
  
    server.listen({
      onUnhandledFrame: "error",
    });

    console.info("[MSW] Started");
  }