import { connect } from "amqplib";
import { env } from "../config.js";
import { MQ_EXCHANGE, normalizeEventType } from "../contracts/cityqMqContract.js";

const EXCHANGE = MQ_EXCHANGE;

let connPromise = null;
let chPromise = null;

async function channel() {
  if (!env.mqUrl) return null;
  if (!connPromise) {
    connPromise = connect(env.mqUrl);
  }
  if (!chPromise) {
    chPromise = (async () => {
      const conn = await connPromise;
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, "topic", { durable: true });
      return ch;
    })();
  }
  return chPromise;
}

/**
 * Publish a cross-module event (notifications, domain fan-out, orchestration).
 * Routing key is the normalized event type; subscribers bind topic patterns per module.
 */
export async function publishEvent({ type, payload, meta }) {
  const ch = await channel();
  if (!ch) return { published: false, reason: "mq_disabled" };

  const routingKey = normalizeEventType(type);
  const msg = {
    type,
    payload: payload ?? null,
    meta: meta ?? {},
    ts: new Date().toISOString(),
  };

  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(msg)), {
    contentType: "application/json",
    persistent: true,
  });
  return { published: true, exchange: EXCHANGE, routingKey };
}

