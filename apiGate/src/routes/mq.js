import { env } from "../config.js";
import { validateClientEventType } from "../contracts/cityqMqContract.js";
import { publishEvent } from "../services/mqPublisher.js";

export async function registerMqRoutes(app) {
  app.post(
    "/api/v1/mq/events",
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.code(401).send({ error: "unauthorized" });
        }
        if (!env.mqUrl) {
          return reply.code(503).send({ error: "mq_disabled" });
        }
      },
    },
    async (request, reply) => {
      const rawType = request.body?.type;
      const checked = validateClientEventType(rawType);
      if (!checked.ok) {
        return reply.code(400).send({ error: checked.error });
      }
      const type = checked.type;

      const payload = request.body?.payload ?? null;
      const meta = {
        actor: request.user?.email ?? request.user?.sub,
        ip: request.ip,
        ua: request.headers["user-agent"],
      };

      try {
        const r = await publishEvent({ type, payload, meta });
        return reply.send({ ok: true, ...r });
      } catch (e) {
        app.log.error({ err: e }, "mq publish failed");
        // This endpoint is best-effort telemetry/workflow triggering.
        // If MQ is temporarily unavailable, don't fail the UI navigation.
        return reply.code(202).send({
          ok: false,
          accepted: true,
          warning: "mq_publish_failed",
        });
      }
    },
  );
}

