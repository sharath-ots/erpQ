import { mintCityQAccessToken } from "../services/accessToken.js";

const INTERNAL_KEY = process.env.CITYQ_INTERNAL_KEY ?? "cityq-dev-internal-change-me";

export async function internalRoutes(app) {
  app.post("/internal/mint", async (request, reply) => {
    const key = request.headers["x-cityq-internal-key"];
    if (key !== INTERNAL_KEY) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const sub = request.body?.sub?.trim();
    const email = request.body?.email?.trim();
    if (!sub || !email) {
      return reply.code(400).send({ error: "sub_and_email_required" });
    }
    const allowedDocTypes = Array.isArray(request.body?.allowedDocTypes)
      ? request.body.allowedDocTypes
      : [];
    return mintCityQAccessToken(reply, {
      sub,
      email,
      allowedDocTypes,
    });
  });
}
