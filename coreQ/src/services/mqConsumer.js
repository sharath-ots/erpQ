import { connect } from "amqplib";

/** Mirror apiGate `CORE_QUEUE_BINDINGS` — cross-module fan-out (alerts + domain events + shell). */
const EXCHANGE = "cityq.events";
const QUEUE = "coreq.modules";
const BINDINGS = ["notifications.#", "crm.#", "hr.#", "pur.#", "portal.#"];

async function connectAndConsume({ mqUrl, logger }) {
  const conn = await connect(mqUrl);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, "topic", { durable: true });
  const q = await ch.assertQueue(QUEUE, { durable: true });
  for (const key of BINDINGS) {
    await ch.bindQueue(q.queue, EXCHANGE, key);
  }

  await ch.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const raw = msg.content.toString("utf-8");
      const data = JSON.parse(raw);
      const rk = msg.fields.routingKey ?? "";
      const kind = rk.startsWith("notifications.")
        ? "notification"
        : rk.startsWith("portal.")
          ? "portal"
          : ["crm.", "hr.", "pur."].some((p) => rk.startsWith(p))
            ? "domain"
            : "other";
      logger?.info?.(
        {
          kind,
          type: data?.type,
          routingKey: rk,
          actor: data?.meta?.actor,
        },
        "cross-module mq event received",
      );
    } catch (e) {
      logger?.warn?.({ err: e }, "mq event parse failed");
    } finally {
      ch.ack(msg);
    }
  });

  logger?.info?.(
    { exchange: EXCHANGE, queue: q.queue, bindings: BINDINGS },
    "MQ consumer started",
  );
  return { exchange: EXCHANGE, queue: q.queue, bindings: BINDINGS, conn, ch };
}

export function startMqConsumer({ logger }) {
  const mqUrl = (process.env.CITYQ_MQ_URL ?? "").trim();
  if (!mqUrl) {
    logger?.info?.("MQ consumer disabled (CITYQ_MQ_URL not set)");
    return { started: false, reason: "mq_disabled" };
  }

  let attempt = 0;
  const start = async () => {
    attempt += 1;
    try {
      await connectAndConsume({ mqUrl, logger });
      return;
    } catch (e) {
      const delayMs = Math.min(60_000, 2_000 * attempt);
      logger?.error?.(
        { err: e, attempt, delayMs },
        "MQ consumer connect failed; will retry",
      );
      setTimeout(start, delayMs);
    }
  };

  // Fire-and-forget: MQ must never block or crash coreQ startup.
  start();
  return { started: true, mode: "retry", exchange: EXCHANGE, queue: QUEUE, bindings: BINDINGS };
}

