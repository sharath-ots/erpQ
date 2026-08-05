import { requireJwt, isDocAdmin } from "../lib/auth.js";

export async function docTypesRoutes(app, { pool }) {
  app.get("/api/v1/docs/doc-types", async (request, reply) => {
    requireJwt(request);
    const { rows } = await pool.query(
      "select * from doc_type_definitions where active = true order by label asc",
    );
    return reply.send({ docTypes: rows });
  });

  app.put("/api/v1/docs/doc-types/:docType", async (request, reply) => {
    const actor = requireJwt(request);
    if (!isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const docType = String(request.params.docType || "").trim();
    const label = String(request.body?.label || docType).trim();
    const description = request.body?.description
      ? String(request.body.description).trim()
      : null;
    const requiredFields = request.body?.requiredFields || [];
    const optionalFields = request.body?.optionalFields || [];

    await pool.query(
      `
        insert into doc_type_definitions(
          doc_type, label, description, required_fields, optional_fields, updated_by_email
        )
        values ($1,$2,$3,$4,$5,$6)
        on conflict (doc_type) do update set
          label = excluded.label,
          description = excluded.description,
          required_fields = excluded.required_fields,
          optional_fields = excluded.optional_fields,
          updated_by_email = excluded.updated_by_email,
          updated_at = now()
      `,
      [
        docType,
        label,
        description,
        JSON.stringify(requiredFields),
        JSON.stringify(optionalFields),
        actor.email,
      ],
    );
    return reply.send({ ok: true });
  });
}
