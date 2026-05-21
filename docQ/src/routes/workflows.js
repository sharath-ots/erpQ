function requireJwt(request) {
  const u = request.user;
  if (!u?.email) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return u;
}

function isAdmin(request) {
  // V1: treat allowlist claim "*" as “admin” for workflow config (keeps auth model consistent).
  // Later: add a dedicated docQ admin group mapping.
  return Array.isArray(request.user?.allowedDocTypes) &&
    request.user.allowedDocTypes.includes("*");
}

export async function workflowsRoutes(app, { pool }) {
  app.get("/api/v1/docs/workflows", async (request, reply) => {
    requireJwt(request);
    const { rows } = await pool.query(
      "select doc_type, definition, updated_at, updated_by_email from docq_workflow_definitions order by doc_type asc",
    );
    return reply.send({ workflows: rows });
  });

  app.put("/api/v1/docs/workflows/:docType", async (request, reply) => {
    const actor = requireJwt(request);
    if (!isAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const docType = String(request.params.docType || "").trim();
    if (!docType) return reply.code(400).send({ error: "docType_required" });
    const definition = request.body?.definition;
    if (!definition || typeof definition !== "object") {
      return reply.code(400).send({ error: "definition_object_required" });
    }
    await pool.query(
      `
        insert into docq_workflow_definitions(doc_type, definition, updated_at, updated_by_email)
        values ($1,$2, now(), $3)
        on conflict (doc_type) do update set
          definition = excluded.definition,
          updated_at = now(),
          updated_by_email = excluded.updated_by_email
      `,
      [docType, definition, actor.email],
    );
    return reply.send({ ok: true });
  });
}

