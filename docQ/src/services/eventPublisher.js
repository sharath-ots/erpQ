import { connect } from "amqplib";
import { env } from "../config.js";

const EXCHANGE = "cityq.events";
let chPromise = null;

function resetChannel() {
  chPromise = null;
}

async function channel() {
  if (!env.mqUrl) return null;
  if (!chPromise) {
    chPromise = (async () => {
      const conn = await connect(env.mqUrl);
      // Any connection-level problem invalidates the cached channel so the next
      // publish attempt can reconnect instead of reusing a dead channel.
      conn.on("error", resetChannel);
      conn.on("close", resetChannel);
      const ch = await conn.createChannel();
      ch.on("error", resetChannel);
      ch.on("close", resetChannel);
      await ch.assertExchange(EXCHANGE, "topic", { durable: true });
      return ch;
    })().catch((err) => {
      // Don't cache a rejected promise — otherwise every future publish fails forever.
      resetChannel();
      throw err;
    });
  }
  return chPromise;
}

/**
 * Publish a document workflow event. Best-effort ONLY: messaging is a side-effect
 * and must never break or roll back a workflow transition. Failures are swallowed
 * (logged to stderr) and reported via the return value.
 *
 * @param {string} type - e.g. doc.submitted, doc.approved
 * @param {object} payload
 * @param {object} meta
 */
export async function publishDocEvent(type, payload, meta = {}) {
  try {
    const ch = await channel();
    if (!ch) return { published: false, reason: "mq_disabled" };
    const msg = {
      type,
      payload,
      meta,
      ts: new Date().toISOString(),
    };
    ch.publish(EXCHANGE, type, Buffer.from(JSON.stringify(msg)), {
      contentType: "application/json",
      persistent: true,
    });
    return { published: true, routingKey: type };
  } catch (err) {
    resetChannel();
    // eslint-disable-next-line no-console
    console.error(
      `[docq] event publish failed (non-fatal) type=${type}: ${err?.message || err}`,
    );
    return { published: false, reason: "publish_failed", error: String(err?.message || err) };
  }
}
