export async function healthRoutes(app) {
  app.get("/health", async () => ({
    status: "ok",
    service: "authq",
    timestamp: new Date().toISOString(),
  }));
}
