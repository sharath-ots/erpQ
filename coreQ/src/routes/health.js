export async function healthRoutes(app) {
  app.get("/health", async () => ({
    status: "ok",
    service: "coreq",
    timestamp: new Date().toISOString(),
    settings_loaded: true,
  }));
}
