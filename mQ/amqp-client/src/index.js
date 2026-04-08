import { connect } from "amqplib";

/**
 * Minimal connection helper — extend with reconnect, confirm channels, and DLQ helpers.
 */
export async function createConnection(opts) {
  return connect(opts.url);
}

export async function assertTopicExchange(ch, name) {
  await ch.assertExchange(name, "topic", { durable: true });
}
