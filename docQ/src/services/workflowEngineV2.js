import crypto from "node:crypto";
import { isDocAdmin, normalizeEmail } from "../lib/auth.js";
import { DOC_STATES, TASK_ROLES } from "../lib/documentStates.js";
import { approveBump, parseVersion, revokeBump } from "../lib/versioning.js";
import { canAuthorEditDocument } from "./documentMetadata.js";
import { getOrgUser, resolveStepAssignee } from "./erpOrgSync.js";
import { publishDocEvent } from "./eventPublisher.js";
import { grantVaultFileAccess } from "./vaultAccess.js";
import { env } from "../config.js";

/** Best-effort WorkDrive file share for vault (assignee is not a Team Folder member). */
async function grantAssigneeVaultAccess(pool, doc, email, permission = "write") {
  if (!doc?.workdrive_file_id || !email) return;
  try {
    await grantVaultFileAccess(pool, {
      resourceId: doc.workdrive_file_id,
      email,
      permission,
    });
  } catch {
    // Workflow must not fail if Zoho share lags; assignee still works in docQ.
  }
}

function slaDueAt(days) {
  const d = new Date();
  d.setDate(d.getDate() + (days || env.approvalSlaDays));
  return d.toISOString();
}

function parseDefinition(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function workflowStages(definition) {
  if (!definition) return [];
  if (Array.isArray(definition.stages) && definition.stages.length) {
    return definition.stages;
  }
  if (Array.isArray(definition.steps) && definition.steps.length) {
    return [
      {
        id: "approval",
        label: "Approval",
        role: TASK_ROLES.APPROVER,
        mode: "sequential",
        assignees: definition.steps,
        allowSendBack: definition.allowSendBack !== false,
        sendBackTargets: ["author"],
      },
    ];
  }
  return [];
}

export async function loadWorkflowDefinition(pool, docType) {
  const { rows } = await pool.query(
    "select definition from workflow_definitions where doc_type = $1",
    [docType],
  );
  return parseDefinition(rows[0]?.definition);
}

/**
 * Resolve emails allowed to revoke an approved document for this doc type.
 * Admins always may revoke (checked separately via request).
 */
export async function resolveAllowedRevokers(pool, doc, definition) {
  const steps = Array.isArray(definition?.revoke?.allowedRevokers)
    ? definition.revoke.allowedRevokers
    : [];
  if (!steps.length) return [];
  const org = await getOrgUser(pool, doc.author_email);
  const emails = [];
  for (const step of steps) {
    const email = await resolveStepAssignee(pool, step, doc, org);
    if (email) emails.push(normalizeEmail(email));
  }
  return [...new Set(emails)];
}

export async function actorCanRevokeDocument(pool, doc, actorEmail, request) {
  if (!doc || doc.state !== DOC_STATES.APPROVED) return false;
  if (isDocAdmin(request)) return true;
  const actor = normalizeEmail(actorEmail);
  if (!actor) return false;
  const definition = await loadWorkflowDefinition(pool, doc.doc_type);
  const allowed = await resolveAllowedRevokers(pool, doc, definition);
  return allowed.includes(actor);
}

async function stampHistorySnapshot(client, {
  doc,
  actorEmail,
  stateAtSnapshot,
}) {
  const ver = parseVersion(doc);
  // Sequential queries — a single pg client cannot run concurrent queries.
  const reviewPoints = await client.query(
    "select * from review_points where document_id = $1 order by created_at asc",
    [doc.id],
  );
  const reviewComments = await client.query(
    "select * from review_comments where document_id = $1 order by created_at asc",
    [doc.id],
  );
  const transitions = await client.query(
    "select * from transition_history where document_id = $1 order by created_at asc",
    [doc.id],
  );
  const tasks = await client.query(
    "select * from workflow_tasks where document_id = $1 order by created_at asc",
    [doc.id],
  );
  const metaHistory = await client.query(
    "select * from document_metadata_history where document_id = $1 order by created_at asc",
    [doc.id],
  );

  const metadata = {
    title: doc.title,
    description: doc.description,
    doc_type: doc.doc_type,
    department: doc.department,
    classification: doc.classification,
    reference_number: doc.reference_number,
    tags: doc.tags,
    custom_metadata: doc.custom_metadata,
    author_email: doc.author_email,
    approved_at: doc.approved_at,
    version_label: ver.label,
  };

  const bundle = {
    review_points: reviewPoints.rows,
    review_comments: reviewComments.rows,
    transition_history: transitions.rows,
    workflow_tasks: tasks.rows,
    metadata_history: metaHistory.rows,
  };

  await client.query(
    `
      insert into document_history_snapshots(
        document_id, version_label, version_major, version_minor,
        state_at_snapshot, metadata, workdrive_file_id, workdrive_permalink,
        bundle, stamped_by_email, stamped_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
      on conflict (document_id, version_label) do update set
        state_at_snapshot = excluded.state_at_snapshot,
        metadata = excluded.metadata,
        workdrive_file_id = excluded.workdrive_file_id,
        workdrive_permalink = excluded.workdrive_permalink,
        bundle = excluded.bundle,
        stamped_by_email = excluded.stamped_by_email,
        stamped_at = now()
    `,
    [
      doc.id,
      ver.label,
      ver.major,
      ver.minor,
      stateAtSnapshot,
      JSON.stringify(metadata),
      doc.workdrive_file_id || null,
      doc.workdrive_permalink || null,
      JSON.stringify(bundle),
      normalizeEmail(actorEmail),
    ],
  );

  await client.query(
    `
      update document_versions set is_historical = true
      where document_id = $1
        and (
          version_label = $2
          or (version_major = $3 and version_minor = $4)
          or workdrive_file_id = $5
        )
    `,
    [doc.id, ver.label, ver.major, ver.minor, doc.workdrive_file_id || null],
  );
}

async function expandStageAssignees(pool, stage, doc, org) {
  const assignees = Array.isArray(stage.assignees) ? stage.assignees : [];
  const resolved = [];
  for (let i = 0; i < assignees.length; i++) {
    const step = assignees[i];
    const email = await resolveStepAssignee(pool, step, doc, org);
    if (email) {
      resolved.push({
        order: step.order ?? i + 1,
        email: normalizeEmail(email),
      });
    }
  }
  const seen = new Set();
  return resolved.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
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

async function createWorkflowTask(client, {
  documentId,
  instanceId,
  stageId,
  role,
  assigneeEmail,
  stepOrder,
  dueAt,
}) {
  const { rows } = await client.query(
    `
      insert into workflow_tasks(
        document_id, instance_id, stage_id, role, assignee_email,
        step_order, status, due_at
      )
      values ($1,$2,$3,$4,$5,$6,'pending',$7)
      returning *
    `,
    [
      documentId,
      instanceId,
      stageId,
      role,
      normalizeEmail(assigneeEmail),
      stepOrder,
      dueAt,
    ],
  );
  return rows[0];
}

async function cancelPendingTasks(client, documentId) {
  await client.query(
    `
      update workflow_tasks set
        status = 'cancelled',
        completed_at = now()
      where document_id = $1 and status = 'pending'
    `,
    [documentId],
  );
}

async function getPendingTaskForActor(client, documentId, actorEmail) {
  const { rows } = await client.query(
    `
      select * from workflow_tasks
      where document_id = $1 and assignee_email = $2 and status = 'pending'
      order by created_at asc
      limit 1
    `,
    [documentId, normalizeEmail(actorEmail)],
  );
  return rows[0] || null;
}

async function activateStage(client, pool, {
  instance,
  stage,
  stageIndex,
  doc,
  org,
  definition,
  actorEmail,
}) {
  const assignees = await expandStageAssignees(pool, stage, doc, org);
  if (!assignees.length) {
    const e = new Error("no_assignees_for_stage");
    e.statusCode = 400;
    e.detail = `Could not resolve assignees for stage "${stage.id}". Check workflow definition and ERPNext org data.`;
    throw e;
  }

  const mode = String(stage.mode || "sequential").toLowerCase();
  const slaDays = definition?.rules?.slaDays ?? env.approvalSlaDays;
  const dueAt = slaDueAt(slaDays);
  const role = stage.role || TASK_ROLES.REVIEWER;

  await client.query(
    `
      update workflow_instances set
        current_stage_id = $2,
        current_stage_index = $3,
        status = 'active',
        last_return_stage_id = null,
        last_return_role = null,
        updated_at = now()
      where id = $1
    `,
    [instance.id, stage.id, stageIndex],
  );

  await client.query(
    `
      update documents set
        state = $2,
        workflow_stage = $3,
        workflow_mode = 'preset',
        submitted_at = coalesce(submitted_at, now()),
        modified_by_email = $4,
        updated_at = now()
      where id = $1
    `,
    [doc.id, DOC_STATES.IN_REVIEW, stage.id, normalizeEmail(actorEmail)],
  );

  if (mode === "parallel") {
    for (let i = 0; i < assignees.length; i++) {
      await createWorkflowTask(client, {
        documentId: doc.id,
        instanceId: instance.id,
        stageId: stage.id,
        role,
        assigneeEmail: assignees[i].email,
        stepOrder: i + 1,
        dueAt,
      });
      await grantAssigneeVaultAccess(pool, doc, assignees[i].email, "write");
    }
    await client.query(
      `update documents set current_approver_email = $2 where id = $1`,
      [doc.id, assignees.map((a) => a.email).join(", ")],
    );
  } else {
    const first = assignees.sort((a, b) => a.order - b.order)[0];
    await createWorkflowTask(client, {
      documentId: doc.id,
      instanceId: instance.id,
      stageId: stage.id,
      role,
      assigneeEmail: first.email,
      stepOrder: first.order,
      dueAt,
    });
    await grantAssigneeVaultAccess(pool, doc, first.email, "write");
    await client.query(
      `update documents set current_approver_email = $2 where id = $1`,
      [doc.id, first.email],
    );
  }

  return { stageId: stage.id, assignees: assignees.map((a) => a.email) };
}

async function stagePendingCount(client, documentId, stageId) {
  const { rows } = await client.query(
    `
      select count(*)::int as n from workflow_tasks
      where document_id = $1 and stage_id = $2 and status = 'pending'
    `,
    [documentId, stageId],
  );
  return rows[0]?.n ?? 0;
}

async function completeStageAndAdvance(client, pool, {
  instance,
  doc,
  definition,
  stages,
  completedStageIndex,
  actorEmail,
  comment,
}) {
  const nextIndex = completedStageIndex + 1;
  if (nextIndex < stages.length) {
    const nextStage = stages[nextIndex];
    await writeHistory(client, {
      documentId: doc.id,
      fromState: doc.state,
      toState: DOC_STATES.IN_REVIEW,
      action: "stage_complete",
      actorEmail,
      comment: comment || `Advanced to ${nextStage.label || nextStage.id}`,
    });
    await activateStage(client, pool, {
      instance,
      stage: nextStage,
      stageIndex: nextIndex,
      doc,
      org: await getOrgUser(pool, doc.author_email),
      definition,
      actorEmail,
    });
    await publishDocEvent(
      "doc.stage_advanced",
      { documentId: doc.id, stageId: nextStage.id },
      { actor: actorEmail },
    );
    return { state: DOC_STATES.IN_REVIEW, workflowStage: nextStage.id };
  }

  const approvedVer = approveBump(doc);
  await client.query(
    `
      update documents set
        state = 'approved',
        workflow_stage = null,
        approved_at = now(),
        current_approver_email = null,
        version = $3,
        version_label = $4,
        version_major = $5,
        version_minor = $6,
        revoke_reason = null,
        revision_of_label = null,
        under_revision_since = null,
        modified_by_email = $2,
        updated_at = now()
      where id = $1
    `,
    [
      doc.id,
      normalizeEmail(actorEmail),
      approvedVer.version,
      approvedVer.label,
      approvedVer.major,
      approvedVer.minor,
    ],
  );
  await client.query(
    `
      insert into document_versions(
        document_id, workdrive_file_id, workdrive_permalink,
        version, version_label, version_major, version_minor,
        uploaded_by_email, change_summary, is_historical
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
    `,
    [
      doc.id,
      doc.workdrive_file_id || null,
      doc.workdrive_permalink || null,
      approvedVer.version,
      approvedVer.label,
      approvedVer.major,
      approvedVer.minor,
      normalizeEmail(actorEmail),
      comment || "Approved version",
    ],
  );
  await client.query(
    `
      update workflow_instances set
        status = 'completed',
        completed_at = now(),
        updated_at = now()
      where id = $1
    `,
    [instance.id],
  );
  await writeHistory(client, {
    documentId: doc.id,
    fromState: doc.state,
    toState: DOC_STATES.APPROVED,
    action: "approve",
    actorEmail,
    comment: comment
      ? `${comment} (version ${approvedVer.label})`
      : `Approved as ${approvedVer.label}`,
  });
  await publishDocEvent(
    "doc.approved",
    { documentId: doc.id, title: doc.title, versionLabel: approvedVer.label },
    { actor: actorEmail },
  );
  return { state: DOC_STATES.APPROVED, versionLabel: approvedVer.label };
}

async function handleApprove(client, pool, { doc, instance, definition, stages, actor, comment }) {
  const task = await getPendingTaskForActor(client, doc.id, actor);
  if (!task) {
    const e = new Error("forbidden");
    e.statusCode = 403;
    e.detail = "No pending workflow task for you on this document.";
    throw e;
  }

  const stageIndex = instance.current_stage_index ?? 0;
  const stage = stages[stageIndex];
  if (!stage || stage.id !== task.stage_id) {
    const e = new Error("workflow_stage_mismatch");
    e.statusCode = 409;
    throw e;
  }

  await client.query(
    `
      update workflow_tasks set
        status = 'completed',
        decision = 'approved',
        comment = $3,
        completed_at = now(),
        completed_by_email = $2
      where id = $1
    `,
    [task.id, actor, comment || null],
  );

  const mode = String(stage.mode || "sequential").toLowerCase();

  if (mode === "parallel") {
    const pending = await stagePendingCount(client, doc.id, stage.id);
    if (pending > 0) {
      await writeHistory(client, {
        documentId: doc.id,
        fromState: doc.state,
        toState: doc.state,
        action: "review_complete",
        actorEmail: actor,
        comment,
      });
      return { state: doc.state, workflowStage: stage.id, pendingInStage: pending };
    }
    return completeStageAndAdvance(client, pool, {
      instance,
      doc,
      definition,
      stages,
      completedStageIndex: stageIndex,
      actorEmail: actor,
      comment,
    });
  }

  const assignees = await expandStageAssignees(
    pool,
    stage,
    doc,
    await getOrgUser(pool, doc.author_email),
  );
  const sorted = assignees.sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex((a) => a.email === actor);
  const next = currentIdx >= 0 ? sorted[currentIdx + 1] : null;

  if (next) {
    const slaDays = definition?.rules?.slaDays ?? env.approvalSlaDays;
    await createWorkflowTask(client, {
      documentId: doc.id,
      instanceId: instance.id,
      stageId: stage.id,
      role: stage.role || TASK_ROLES.APPROVER,
      assigneeEmail: next.email,
      stepOrder: next.order,
      dueAt: slaDueAt(slaDays),
    });
    await grantAssigneeVaultAccess(pool, doc, next.email, "write");
    await client.query(
      `update documents set current_approver_email = $2, modified_by_email = $3, updated_at = now() where id = $1`,
      [doc.id, next.email, actor],
    );
    await writeHistory(client, {
      documentId: doc.id,
      fromState: doc.state,
      toState: doc.state,
      action: "approve_forward",
      actorEmail: actor,
      comment: comment || `Forwarded to ${next.email}`,
    });
    await publishDocEvent(
      "doc.approval_forwarded",
      { documentId: doc.id, assignee: next.email },
      { actor },
    );
    return { state: doc.state, workflowStage: stage.id, currentApprover: next.email };
  }

  return completeStageAndAdvance(client, pool, {
    instance,
    doc,
    definition,
    stages,
    completedStageIndex: stageIndex,
    actorEmail: actor,
    comment,
  });
}

function reviewPointsFromBody(body, comment) {
  if (Array.isArray(body?.reviewPoints) && body.reviewPoints.length) {
    return body.reviewPoints.map((p) => String(p).trim()).filter(Boolean);
  }
  if (!comment) return [];
  return comment
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {import("pg").Pool} pool
 */
export async function applyTransitionV2(pool, opts) {
  const {
    doc,
    actorEmail,
    action,
    comment,
    firstApproverEmail,
    reviewPoints: reviewPointsInput,
    revokeReason,
    assignToEmail,
    isAdmin,
  } = opts;
  const actor = normalizeEmail(actorEmail);
  const fromState = doc.state;

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (action === "submit") {
      if (doc.zone !== "managed") {
        const e = new Error("managed_document_required");
        e.statusCode = 400;
        throw e;
      }
      if (
        doc.state !== DOC_STATES.DRAFT &&
        doc.state !== DOC_STATES.UNDER_REVISION
      ) {
        const e = new Error("invalid_state_for_submit");
        e.statusCode = 400;
        throw e;
      }
      if (!canAuthorEditDocument(doc, actor)) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }

      let definition = await loadWorkflowDefinition(pool, doc.doc_type);
      // Ensure definition is a valid object
      if (!definition || typeof definition !== "object") {
        definition = { version: 2, stages: [] };
      }
      let stages = workflowStages(definition);

      // 1. STAGE 1: Author submits to Reviewer
      if (opts.reviewerEmail) {
        const revEmail = normalizeEmail(opts.reviewerEmail);
        stages = [{
          id: "review",
          label: "Review",
          role: "reviewer", 
          mode: "sequential",
          assignees: [{ type: "user", value: revEmail }],
          allowSendBack: true,
          sendBackTargets: ["author"],
        }];
        
        // CRITICAL FIX: Attach the stages back to the definition so it saves to the DB!
        definition.stages = stages;
      }

      // if (firstApproverEmail) {
      //   const cleanEmail = normalizeEmail(firstApproverEmail);
      //   if (!cleanEmail.endsWith("@versaq.eu")) {
      //     const e = new Error("invalid_assignee");
      //     e.statusCode = 403;
      //     e.detail = "You can only assign internal staff as approvers.";
      //     throw e;
      //   }
      //   const adhocStage = {
      //     id: "approval",
      //     label: "Approval",
      //     role: TASK_ROLES.APPROVER, // or REVIEWER, depending on client exact need
      //     mode: "sequential",
      //     assignees: [{ type: "user", value: cleanEmail }],
      //     allowSendBack: true,
      //     sendBackTargets: ["author"],
      //   };
      //   stages = [adhocStage];
      // }

      // if (!stages.length && firstApproverEmail) {
      //   definition = {
      //     version: 2,
      //     stages: [
      //       {
      //         id: "approval",
      //         label: "Approval",
      //         role: TASK_ROLES.APPROVER,
      //         mode: "sequential",
      //         assignees: [{ type: "user", value: firstApproverEmail }],
      //         allowSendBack: true,
      //         sendBackTargets: ["author"],
      //       },
      //     ],
      //   };
      //   stages = definition.stages;
      // }

      if (!stages.length) {
        const e = new Error("workflow_not_configured");
        e.statusCode = 400;
        e.detail = "No workflow for this document type. Configure Workflow Admin or pick a first approver.";
        throw e;
      }

      const org = await getOrgUser(pool, doc.author_email);
      const { rows: existingInst } = await client.query(
        "select id from workflow_instances where document_id = $1",
        [doc.id],
      );
      const instanceId = existingInst[0]?.id || crypto.randomUUID();

      await client.query(
        `
          insert into workflow_instances(
            id, document_id, doc_type, definition_version, definition_snapshot,
            current_stage_id, current_stage_index, status
          )
          values ($1,$2,$3,$4,$5,null,0,'active')
          on conflict (document_id) do update set
            doc_type = excluded.doc_type,
            definition_version = excluded.definition_version,
            definition_snapshot = excluded.definition_snapshot,
            current_stage_index = 0,
            status = 'active',
            completed_at = null,
            last_return_stage_id = null,
            last_return_role = null,
            updated_at = now()
        `,
        [
          instanceId,
          doc.id,
          doc.doc_type,
          definition.version || 2,
          JSON.stringify(definition),
        ],
      );

      const { rows: instRows } = await client.query(
        "select * from workflow_instances where document_id = $1",
        [doc.id],
      );
      const instance = instRows[0];

      await cancelPendingTasks(client, doc.id);

      const firstStage = stages[0];
      await activateStage(client, pool, {
        instance,
        stage: firstStage,
        stageIndex: 0,
        doc,
        org,
        definition,
        actorEmail: actor,
      });

      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: DOC_STATES.IN_REVIEW,
        action: "submit",
        actorEmail: actor,
        comment,
      });

      await client.query("commit");
      await publishDocEvent(
        "doc.submitted",
        { documentId: doc.id, title: doc.title, stageId: firstStage.id },
        { actor },
      );
      return { state: DOC_STATES.IN_REVIEW, workflowStage: firstStage.id };
    }

    if (action === "resubmit") {
      if (!canAuthorEditDocument(doc, actor)) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }
      if (doc.state !== DOC_STATES.CHANGES_REQUESTED) {
        const e = new Error("invalid_state_for_resubmit");
        e.statusCode = 400;
        throw e;
      }

      const { rows: instRows } = await client.query(
        "select * from workflow_instances where document_id = $1",
        [doc.id],
      );
      const instance = instRows[0];
      if (!instance) {
        const e = new Error("workflow_instance_missing");
        e.statusCode = 400;
        throw e;
      }

      const definition = parseDefinition(instance.definition_snapshot);
      const stages = workflowStages(definition);
      if (!stages.length) {
        const e = new Error("workflow_not_configured");
        e.statusCode = 400;
        throw e;
      }

      await client.query(
        `
          update review_points set
            status = 'resolved',
            resolved_at = now(),
            resolved_by_email = $2
          where document_id = $1 and status = 'open'
        `,
        [doc.id, actor],
      );

      await cancelPendingTasks(client, doc.id);

      let startIndex = 0;
      const lastStage = instance.last_return_stage_id;
      const lastStageDef = stages.find((s) => s.id === lastStage);
      if (
        lastStageDef &&
        lastStageDef.onResubmit === "return_to_approval" &&
        lastStage === "approval"
      ) {
        startIndex = stages.findIndex((s) => s.id === "approval");
        if (startIndex < 0) startIndex = 0;
      }

      // -------------------------------------------------------------
      // NEW: SELF-HEALING FIX FOR EXISTING DOCUMENTS
      // If the snapshot forgot the assignee, fetch the previous reviewer
      // -------------------------------------------------------------
      if (!stages[startIndex].assignees || stages[startIndex].assignees.length === 0) {
        const { rows: prevTasks } = await client.query(
          "select assignee_email from workflow_tasks where document_id = $1 and stage_id = $2 order by created_at desc limit 1",
          [doc.id, stages[startIndex].id]
        );
        if (prevTasks[0]) {
          stages[startIndex].assignees = [{ type: "user", value: prevTasks[0].assignee_email }];
          definition.stages = stages;
          await client.query("update workflow_instances set definition_snapshot = $1 where id = $2", [JSON.stringify(definition), instance.id]);
        }
      }

      const org = await getOrgUser(pool, doc.author_email);
      await activateStage(client, pool, {
        instance,
        stage: stages[startIndex],
        stageIndex: startIndex,
        doc,
        org,
        definition,
        actorEmail: actor,
      });

      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: DOC_STATES.IN_REVIEW,
        action: "resubmit",
        actorEmail: actor,
        comment,
      });

      await client.query("commit");
      await publishDocEvent("doc.resubmitted", { documentId: doc.id }, { actor });
      return {
        state: DOC_STATES.IN_REVIEW,
        workflowStage: stages[startIndex].id,
      };
    }

    if (action === "approve") {
      const { rows: instRows } = await client.query(
        "select * from workflow_instances where document_id = $1",
        [doc.id],
      );
      const instance = instRows[0];
      if (!instance || instance.status !== "active") {
        const e = new Error("no_active_workflow");
        e.statusCode = 400;
        throw e;
      }

      const definition = parseDefinition(instance.definition_snapshot);
      let stages = workflowStages(definition);
      const currentStage = stages[instance.current_stage_index];

      // 2. STAGE 2 (COMPLETION): Reviewer finishes -> Route back to Author
      if (currentStage && currentStage.role === "reviewer") {
        const routingStage = {
          id: `author_routing_${Date.now()}`,
          label: "Pending Approval Submission",
          role: "author_routing", // Custom role just for the Author
          mode: "sequential",
          assignees: [{ type: "user", value: doc.author_email }],
          allowSendBack: false,
        };
        stages.push(routingStage);
        definition.stages = stages;
        await client.query("update workflow_instances set definition_snapshot = $1 where id = $2", [JSON.stringify(definition), instance.id]);
      } 
      
      // 3. STAGE 3: Author raises to final Approver
      else if (currentStage && currentStage.role === "author_routing") {
        if (!opts.approverEmail) {
          const e = new Error("approver_required");
          e.statusCode = 400;
          throw e;
        }
        const appEmail = normalizeEmail(opts.approverEmail);
        const approvalStage = {
          id: `approval_${Date.now()}`,
          label: "Approval",
          role: "approver", // Routes to "Documents for Approval"
          mode: "sequential",
          assignees: [{ type: "user", value: appEmail }],
          allowSendBack: true,
          sendBackTargets: ["author"],
        };
        stages.push(approvalStage);
        definition.stages = stages;
        await client.query("update workflow_instances set definition_snapshot = $1 where id = $2", [JSON.stringify(definition), instance.id]);
      }

      const result = await handleApprove(client, pool, { doc, instance, definition, stages, actor, comment });
      await client.query("commit");
      return result;
    }

    if (action === "request_changes") {
      const task = await getPendingTaskForActor(client, doc.id, actor);
      if (!task) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        throw e;
      }

      const points = reviewPointsFromBody(
        { reviewPoints: reviewPointsInput },
        comment,
      );
      if (!points.length) {
        const e = new Error("review_points_required");
        e.statusCode = 400;
        e.detail = "Provide review points (one per line) or a reviewPoints array.";
        throw e;
      }

      const { rows: instRows } = await client.query(
        "select * from workflow_instances where document_id = $1",
        [doc.id],
      );
      const instance = instRows[0];
      const round = (doc.review_round || 0) + 1;

      for (const body of points) {
        await client.query(
          `
            insert into review_points(
              document_id, round, stage_id, author_email, body,
              status, requires_action_by, created_by_email
            )
            values ($1,$2,$3,$4,$5,'open','author',$6)
          `,
          [
            doc.id,
            round,
            task.stage_id,
            normalizeEmail(doc.author_email),
            body,
            actor,
          ],
        );
      }

      if (comment) {
        await client.query(
          `
            insert into review_comments(document_id, author_email, body)
            values ($1,$2,$3)
          `,
          [doc.id, actor, comment],
        );
      }

      await cancelPendingTasks(client, doc.id);

      if (instance) {
        await client.query(
          `
            update workflow_instances set
              status = 'paused',
              last_return_stage_id = $2,
              last_return_role = $3,
              updated_at = now()
            where id = $1
          `,
          [instance.id, task.stage_id, task.role],
        );
      }

      await client.query(
        `
          update documents set
            state = $2,
            workflow_stage = null,
            review_round = $3,
            current_approver_email = null,
            modified_by_email = $4,
            updated_at = now()
          where id = $1
        `,
        [doc.id, DOC_STATES.CHANGES_REQUESTED, round, actor],
      );

      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: DOC_STATES.CHANGES_REQUESTED,
        action: "request_changes",
        actorEmail: actor,
        comment,
      });

      await client.query("commit");
      await publishDocEvent(
        "doc.changes_requested",
        { documentId: doc.id, author: doc.author_email, round },
        { actor },
      );
      return { state: DOC_STATES.CHANGES_REQUESTED, reviewRound: round };
    }

    if (action === "archive") {
      await client.query(
        `
          update documents set
            state = 'archived',
            workflow_stage = null,
            current_approver_email = null,
            modified_by_email = $2,
            updated_at = now()
          where id = $1
        `,
        [doc.id, actor],
      );
      await cancelPendingTasks(client, doc.id);
      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: DOC_STATES.ARCHIVED,
        action: "archive",
        actorEmail: actor,
        comment,
      });
      await client.query("commit");
      return { state: DOC_STATES.ARCHIVED };
    }

    if (action === "revoke") {
      if (doc.state !== DOC_STATES.APPROVED) {
        const e = new Error("invalid_state_for_revoke");
        e.statusCode = 400;
        e.detail = "Only approved documents can be revoked for revision.";
        throw e;
      }

      const definition = await loadWorkflowDefinition(pool, doc.doc_type);
      const allowed = await resolveAllowedRevokers(pool, doc, definition);
      if (!isAdmin && !allowed.includes(actor)) {
        const e = new Error("forbidden");
        e.statusCode = 403;
        e.detail = "You are not listed as a revoker for this document type.";
        throw e;
      }

      const reason = String(revokeReason || comment || "").trim();
      if (!reason) {
        const e = new Error("revoke_reason_required");
        e.statusCode = 400;
        e.detail = "Provide a reason for revoking this document.";
        throw e;
      }
      const assignTo = normalizeEmail(assignToEmail || doc.author_email);
      if (!assignTo) {
        const e = new Error("assign_to_required");
        e.statusCode = 400;
        e.detail = "Assign an author for the revision.";
        throw e;
      }

      const previous = parseVersion(doc);
      await stampHistorySnapshot(client, {
        doc,
        actorEmail: actor,
        stateAtSnapshot: DOC_STATES.APPROVED,
      });

      const next = revokeBump(doc);
      await client.query(
        `
          update documents set
            state = $2,
            workflow_stage = null,
            current_approver_email = null,
            author_email = $3,
            revoke_reason = $4,
            revision_of_label = $5,
            under_revision_since = now(),
            version = $6,
            version_label = $7,
            version_major = $8,
            version_minor = $9,
            approved_at = null,
            modified_by_email = $10,
            updated_at = now()
          where id = $1
        `,
        [
          doc.id,
          DOC_STATES.UNDER_REVISION,
          assignTo,
          reason,
          previous.label,
          next.version,
          next.label,
          next.major,
          next.minor,
          actor,
        ],
      );

      await client.query(
        `
          insert into document_versions(
            document_id, workdrive_file_id, workdrive_permalink,
            version, version_label, version_major, version_minor,
            uploaded_by_email, change_summary, is_historical
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
        `,
        [
          doc.id,
          doc.workdrive_file_id || null,
          doc.workdrive_permalink || null,
          next.version,
          next.label,
          next.major,
          next.minor,
          actor,
          `Revoked from ${previous.label}: ${reason}`,
        ],
      );

      await client.query(
        `
          update workflow_instances set
            status = 'completed',
            completed_at = now(),
            updated_at = now()
          where document_id = $1 and status = 'active'
        `,
        [doc.id],
      );
      await cancelPendingTasks(client, doc.id);

      await writeHistory(client, {
        documentId: doc.id,
        fromState,
        toState: DOC_STATES.UNDER_REVISION,
        action: "revoke",
        actorEmail: actor,
        comment: `Revoked ${previous.label} → ${next.label}. Assigned to ${assignTo}. Reason: ${reason}`,
      });

      await client.query("commit");
      await publishDocEvent(
        "doc.revoked",
        {
          documentId: doc.id,
          title: doc.title,
          fromVersion: previous.label,
          toVersion: next.label,
          assignTo,
        },
        { actor },
      );
      return {
        state: DOC_STATES.UNDER_REVISION,
        versionLabel: next.label,
        assignTo,
        revisionOf: previous.label,
      };
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
