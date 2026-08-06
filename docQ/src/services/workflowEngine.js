import crypto from "node:crypto";
import { normalizeEmail } from "../lib/auth.js";
import { isCurrentApprover } from "./documentAcl.js";
import { getOrgUser, resolveStepAssignee } from "./erpOrgSync.js";
import { publishDocEvent } from "./eventPublisher.js";
import { env } from "../config.js";

function slaDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + env.approvalSlaDays);
  return d.toISOString();
}

async function loadWorkflowDef(pool, docType) {
  const { rows } = await pool.query(
    "select definition from workflow_definitions where doc_type = $1",
    [docType],
  );
  return rows[0]?.definition || null;
}

async function writeHistory(client, {
  documentId,
  fromState,
  toState,
  action,
  actorEmail,
  comment,
}) {
  await client.query(
    `
      insert into transition_history(
        document_id, from_state, to_state, action, actor_email, comment
      )
      values ($1,$2,$3,$4,$5,$6)
    `,
    [documentId, fromState, toState, action, actorEmail, comment || null],
  );
}

async function createTask(client, {
  documentId,
  chainId,
  assigneeEmail,
  stepOrder,
}) {
  const { rows } = await client.query(
    `
      insert into approval_tasks(
        document_id, chain_id, assignee_email, step_order, status, due_at
      )
      values ($1,$2,$3,$4,'pending',$5)
      returning *
    `,
    [documentId, chainId, normalizeEmail(assigneeEmail), stepOrder, slaDueAt()],
  );
  return rows[0];
}

async function completePendingTasks(client, documentId, actorEmail, status) {
  await client.query(
    `
      update approval_tasks set
        status = $3,
        completed_at = now(),
        completed_by_email = $4
      where document_id = $1 and assignee_email = $2 and status = 'pending'
    `,
    [documentId, normalizeEmail(actorEmail), status, normalizeEmail(actorEmail)],
  );
}

/**
 * Build approval chain steps from preset workflow definition.
 */
async function expandPresetSteps(pool, definition, doc, org) {
  const steps = Array.isArray(definition?.steps) ? definition.steps : [];
  const resolved = [];
  for (const step of steps.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const email = await resolveStepAssignee(pool, step, doc, org);
    if (email) {
      resolved.push({
        order: step.order || resolved.length + 1,
        type: step.type,
        value: step.value,
        assigneeEmail: email,
      });
    }
  }
  return resolved;
}

/**
 * @param {import("pg").Pool} pool
 * @param {object} opts
 * @param {object} opts.doc - document row
 * @param {string} opts.actorEmail
 * @param {string} opts.action
 * @param {string} [opts.comment]
 * @param {string} [opts.forwardToEmail]
 * @param {string} [opts.firstApproverEmail] - ad-hoc submit
 */
export async function applyTransition(pool, opts) {
  const { doc, actorEmail, action, comment, forwardToEmail, firstApproverEmail } =
    opts;
  const actor = normalizeEmail(actorEmail);
  const fromState = doc.state;

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (action === "submit") {
      if (doc.zone !== "managed") {
        const e = new Error("scratch_must_be_promoted");
        e.statusCode = 400;
        throw e;
      }
      if (!["draft", "changes_requested"].includes(fromState)) {
        const e = new Error("invalid_state_for_submit");
        e.statusCode = 400;
        throw e;
      }
      if (normalizeEmail(doc.author_email || doc.created_by_email) !== actor) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }

      const org = await getOrgUser(pool, actor);
      const definition = await loadWorkflowDef(pool, doc.doc_type);
      let mode = "adhoc";
      let steps = [];

      if (definition?.steps?.length) {
        mode = "preset";
        steps = await expandPresetSteps(pool, definition, doc, org);
      }

      if (!steps.length) {
        const first = normalizeEmail(firstApproverEmail || forwardToEmail);
        if (!first) {
          const e = new Error("first_approver_required");
          e.statusCode = 400;
          e.detail = "No preset workflow; provide firstApproverEmail";
          throw e;
        }
        steps = [{ order: 1, type: "user", assigneeEmail: first }];
        mode = "adhoc";
      }

      const chainId = crypto.randomUUID();
      await client.query(
        `
          insert into approval_chains(id, document_id, mode, steps, current_step_order)
          values ($1,$2,$3,$4,1)
          on conflict (document_id) do update set
            mode = excluded.mode,
            steps = excluded.steps,
            current_step_order = 1,
            updated_at = now()
        `,
        [chainId, doc.id, mode, JSON.stringify(steps)],
      );

      const firstStep = steps[0];
      await createTask(client, {
        documentId: doc.id,
        chainId,
        assigneeEmail: firstStep.assigneeEmail,
        stepOrder: 1,
      });

      const toState = "in_review";
      await client.query(
        `
          update documents set
            state = $2,
            workflow_mode = $3,
            submitted_at = now(),
            current_approver_email = $4,
            modified_by_email = $5,
            updated_at = now()
          where id = $1
        `,
        [doc.id, toState, mode, firstStep.assigneeEmail, actor],
      );
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState,
        action: "submit",
        actorEmail: actor,
        comment,
      });
      await client.query("commit");
      await publishDocEvent("doc.submitted", {
        documentId: doc.id,
        title: doc.title,
        assignee: firstStep.assigneeEmail,
      }, { actor });
      return { state: toState, currentApprover: firstStep.assigneeEmail };
    }

    if (action === "approve") {
      if (!(await isCurrentApprover(pool, doc, actor))) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }
      await completePendingTasks(client, doc.id, actor, "approved");

      const { rows: chainRows } = await client.query(
        "select * from approval_chains where document_id = $1",
        [doc.id],
      );
      const chain = chainRows[0];
      let steps = chain?.steps || [];
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(steps);
        } catch {
          steps = [];
        }
      }
      const nextOrder = (chain?.current_step_order || 1) + 1;
      const nextStep = steps.find((s) => s.order === nextOrder);

      if (nextStep?.assigneeEmail) {
        await client.query(
          "update approval_chains set current_step_order = $2, updated_at = now() where document_id = $1",
          [doc.id, nextOrder],
        );
        await createTask(client, {
          documentId: doc.id,
          chainId: chain.id,
          assigneeEmail: nextStep.assigneeEmail,
          stepOrder: nextOrder,
        });
        await client.query(
          `
            update documents set
              state = 'in_review',
              current_approver_email = $2,
              modified_by_email = $3,
              updated_at = now()
            where id = $1
          `,
          [doc.id, nextStep.assigneeEmail, actor],
        );
        await writeHistory(client, {
          documentId: doc.id,
          fromState,
          toState: "in_review",
          action: "approve_forward",
          actorEmail: actor,
          comment,
        });
        await client.query("commit");
        await publishDocEvent("doc.approval_forwarded", {
          documentId: doc.id,
          assignee: nextStep.assigneeEmail,
        }, { actor });
        return { state: "in_review", currentApprover: nextStep.assigneeEmail };
      }

      await client.query(
        `
          update documents set
            state = 'approved',
            approved_at = now(),
            current_approver_email = null,
            modified_by_email = $2,
            updated_at = now()
          where id = $1
        `,
        [doc.id, actor],
      );
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: "approved",
        action: "approve",
        actorEmail: actor,
        comment,
      });
      await client.query("commit");
      await publishDocEvent("doc.approved", { documentId: doc.id, title: doc.title }, {
        actor,
      });
      return { state: "approved" };
    }

    if (action === "request_changes") {
      if (!(await isCurrentApprover(pool, doc, actor))) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }
      await completePendingTasks(client, doc.id, actor, "returned");
      const toState = "changes_requested";
      await client.query(
        `
          update documents set
            state = $2,
            current_approver_email = null,
            modified_by_email = $3,
            updated_at = now()
          where id = $1
        `,
        [doc.id, toState, actor],
      );
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState,
        action: "request_changes",
        actorEmail: actor,
        comment,
      });
      if (comment) {
        await client.query(
          `
            insert into review_comments(document_id, author_email, body)
            values ($1,$2,$3)
          `,
          [doc.id, actor, comment],
        );
      }
      await client.query("commit");
      await publishDocEvent(
        "doc.changes_requested",
        { documentId: doc.id, author: doc.author_email },
        { actor },
      );
      return { state: toState };
    }

    if (action === "forward") {
      if (!(await isCurrentApprover(pool, doc, actor))) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }
      const next = normalizeEmail(forwardToEmail);
      if (!next) {
        const e = new Error("forwardToEmail_required");
        e.statusCode = 400;
        throw e;
      }
      await completePendingTasks(client, doc.id, actor, "forwarded");

      const { rows: chainRows } = await client.query(
        "select * from approval_chains where document_id = $1",
        [doc.id],
      );
      let chain = chainRows[0];
      if (!chain) {
        const chainId = crypto.randomUUID();
        await client.query(
          `
            insert into approval_chains(id, document_id, mode, steps, current_step_order)
            values ($1,$2,'adhoc','[]',1)
          `,
          [chainId, doc.id],
        );
        chain = { id: chainId, current_step_order: 1 };
      }

      const newOrder = (chain.current_step_order || 1) + 1;
      let steps = chain.steps || [];
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(steps);
        } catch {
          steps = [];
        }
      }
      if (!Array.isArray(steps)) steps = [];
      steps = [...steps];
      steps.push({ order: newOrder, type: "user", assigneeEmail: next });
      await client.query(
        `
          update approval_chains set
            steps = $2,
            current_step_order = $3,
            updated_at = now()
          where document_id = $1
        `,
        [doc.id, JSON.stringify(steps), newOrder],
      );
      await createTask(client, {
        documentId: doc.id,
        chainId: chain.id,
        assigneeEmail: next,
        stepOrder: newOrder,
      });
      await client.query(
        `
          update documents set
            current_approver_email = $2,
            modified_by_email = $3,
            updated_at = now()
          where id = $1
        `,
        [doc.id, next, actor],
      );
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: fromState,
        action: "forward",
        actorEmail: actor,
        comment: comment || `Forwarded to ${next}`,
      });
      await client.query("commit");
      await publishDocEvent("doc.forwarded", { documentId: doc.id, assignee: next }, {
        actor,
      });
      return { state: fromState, currentApprover: next };
    }

    if (action === "archive") {
      await client.query(
        `
          update documents set state = 'archived', modified_by_email = $2, updated_at = now()
          where id = $1
        `,
        [doc.id, actor],
      );
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: "archived",
        action: "archive",
        actorEmail: actor,
        comment,
      });
      await client.query("commit");
      return { state: "archived" };
    }

    const e = new Error("unknown_action");
    e.statusCode = 400;
    throw e;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
