import { env } from "../config.js";
import { encryptString } from "../lib/crypto.js";

function assertServiceKey(request) {
  if (!env.cityqServiceKey) {
    const e = new Error("CITYQ_SERVICE_KEY not configured");
    e.statusCode = 503;
    throw e;
  }
  const key = request.headers["x-cityq-service-key"];
  if (key !== env.cityqServiceKey) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
}

export async function internalRoutes(app, { pool }) {
  app.post("/internal/zoho/token/upsert", async (request, reply) => {
    assertServiceKey(request);

    const email = String(request.body?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return reply.code(400).send({ error: "email_required" });
    }

    const zohoId = request.body?.zohoId ? String(request.body.zohoId) : null;
    const refresh = request.body?.refresh_token
      ? String(request.body.refresh_token)
      : null;
    if (!refresh) {
      return reply.code(400).send({ error: "refresh_token_required" });
    }

    const enc = encryptString(refresh, env.tokenEncKeyB64);
    await pool.query(
      `
        insert into docq_zoho_tokens(
          user_email, zoho_id,
          refresh_token_alg, refresh_token_iv_b64, refresh_token_tag_b64, refresh_token_ciphertext_b64,
          updated_at
        )
        values ($1,$2,$3,$4,$5,$6, now())
        on conflict (user_email) do update set
          zoho_id = excluded.zoho_id,
          refresh_token_alg = excluded.refresh_token_alg,
          refresh_token_iv_b64 = excluded.refresh_token_iv_b64,
          refresh_token_tag_b64 = excluded.refresh_token_tag_b64,
          refresh_token_ciphertext_b64 = excluded.refresh_token_ciphertext_b64,
          updated_at = now()
      `,
      [
        email,
        zohoId,
        enc.alg,
        enc.iv_b64,
        enc.tag_b64,
        enc.ciphertext_b64,
      ],
    );

    return reply.send({ ok: true });
  });
}

