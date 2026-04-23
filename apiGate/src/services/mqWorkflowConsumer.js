import { connect } from "amqplib";
import { env } from "../config.js";
import { MQ_EXCHANGE } from "../contracts/cityqMqContract.js";
import { getFrappeClient } from "../frappe/singleton.js";

/**
 * Workflow queue: orchestration tied to apiGate (e.g. ERPNext writes). Other services
 * (coreQ, future workers) subscribe to the same routing keys on different queues for
 * notifications, alerts, or module-specific persistence — see CORE_QUEUE_BINDINGS.
 */
const EXCHANGE = MQ_EXCHANGE;
const QUEUE = "apigate.workflows";
const BINDINGS = ["crm.lead.created"];

async function ensureSupplierAndItem(frappe) {
  // Best-effort helpers so PO creation has something to reference.
  try {
    await frappe.createDocument("Supplier", {
      supplier_name: "CITYQ-DUMMY-SUP",
      supplier_type: "Company",
    });
  } catch {
    // ignore (may already exist / permissions)
  }

  try {
    await frappe.createDocument("Item", {
      item_code: "CITYQ-DUMMY-ITEM",
      item_name: "CITYQ Dummy Item",
      stock_uom: "Nos",
      is_stock_item: 0,
    });
  } catch {
    // ignore
  }
}

export function startMqWorkflowConsumer({ logger }) {
  if (!env.mqUrl) {
    logger?.info?.("MQ workflow consumer disabled (CITYQ_MQ_URL not set)");
    return;
  }

  let attempt = 0;
  const start = async () => {
    attempt += 1;
    try {
      const conn = await connect(env.mqUrl);
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, "topic", { durable: true });
      const q = await ch.assertQueue(QUEUE, { durable: true });
      for (const key of BINDINGS) {
        await ch.bindQueue(q.queue, EXCHANGE, key);
      }

      await ch.consume(q.queue, async (msg) => {
        if (!msg) return;
        let data = null;
        try {
          data = JSON.parse(msg.content.toString("utf-8"));
        } catch (e) {
          logger?.warn?.({ err: e }, "mq workflow parse failed");
          ch.ack(msg);
          return;
        }

        const type = data?.type;
        if (type !== "crm.lead.created") {
          ch.ack(msg);
          return;
        }

        try {
          const frappe = getFrappeClient();
          const leadName = data?.payload?.lead;
          const actor = data?.meta?.actor;

          // 1) Create ToDo linked to Lead.
          await frappe.createDocument("ToDo", {
            description: `Follow up lead ${leadName ?? ""}`.trim(),
            status: "Open",
            priority: "Medium",
            reference_type: "Lead",
            reference_name: leadName,
            allocated_to: actor,
          });

          // 2) Create Purchase Order (best-effort). Needs a default company.
          const company = (process.env.ERPNEXT_DEFAULT_COMPANY ?? "").trim();
          if (company) {
            await ensureSupplierAndItem(frappe);
            const today = new Date().toISOString().slice(0, 10);
            await frappe.createDocument("Purchase Order", {
              supplier: "CITYQ-DUMMY-SUP",
              company,
              transaction_date: today,
              schedule_date: today,
              items: [
                {
                  item_code: "CITYQ-DUMMY-ITEM",
                  qty: 1,
                  schedule_date: today,
                  rate: 1,
                },
              ],
            });
          } else {
            logger?.warn?.(
              { env: "ERPNEXT_DEFAULT_COMPANY" },
              "Skipping Purchase Order create (missing ERPNEXT_DEFAULT_COMPANY)",
            );
          }

          logger?.info?.({ lead: leadName }, "workflow applied for crm.lead.created");
          ch.ack(msg);
        } catch (e) {
          logger?.error?.({ err: e }, "workflow handler failed");
          // Ack to avoid poison loop in this dummy workflow.
          ch.ack(msg);
        }
      });

      logger?.info?.(
        { exchange: EXCHANGE, queue: QUEUE, bindings: BINDINGS },
        "MQ workflow consumer started",
      );
    } catch (e) {
      const delayMs = Math.min(60_000, 2_000 * attempt);
      logger?.error?.({ err: e, attempt, delayMs }, "MQ workflow consumer failed; retrying");
      setTimeout(start, delayMs);
    }
  };

  start();
}

