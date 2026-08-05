import { isDocAdmin, requireJwt, sendError } from "../lib/auth.js";
import {
  actorCanRevokeDocument,
  applyTransitionV2,
} from "../services/workflowEngineV2.js";
import { canReadDocument } from "../services/documentAcl.js";

export async function transitionsRoutes(app, { pool }) {
  app.post("/api/v1/docs/documents/:id/transition", async (request, reply) => {
    const actor = requireJwt(request);
    const action = String(request.body?.action || "").trim();
    const comment = request.body?.comment ? String(request.body.comment) : null;
    const firstApproverEmail = request.body?.firstApproverEmail
      ? String(request.body.firstApproverEmail).trim()
      : null;
    const reviewPoints = Array.isArray(request.body?.reviewPoints)
      ? request.body.reviewPoints.map(String)
      : null;
    const revokeReason = request.body?.revokeReason
      ? String(request.body.revokeReason).trim()
      : null;
    const assignToEmail = request.body?.assignToEmail
      ? String(request.body.assignToEmail).trim()
      : null;

    if (!action) return reply.code(400).send({ error: "action_required" });

    const { rows } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = rows[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    const canRead = await canReadDocument(pool, doc, actor.email, request);
    const canRevoke =
      action === "revoke"
        ? await actorCanRevokeDocument(pool, doc, actor.email, request)
        : false;
    if (!canRead && !canRevoke) {
      return reply.code(403).send({ error: "forbidden" });
    }

    try {
      const result = await applyTransitionV2(pool, {
        doc,
        actorEmail: actor.email,
        action,
        comment,
        firstApproverEmail,
        reviewPoints,
        revokeReason,
        assignToEmail,
        isAdmin: isDocAdmin(request),
      });
      const { rows: updated } = await pool.query(
        "select * from documents where id = $1",
        [doc.id],
      );
      return reply.send({ ok: true, result, document: updated[0] });
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
