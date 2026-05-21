export async function healthRoutes(app, { pool }) {
  app.get("/health", async () => {
    let db = "down";
    try {
      const r = await pool.query("select 1 as ok");
      db = r?.rows?.[0]?.ok === 1 ? "ok" : "degraded";
    } catch {
      db = "down";
    }
    return { status: "ok", service: "docq", db };
  });
}

