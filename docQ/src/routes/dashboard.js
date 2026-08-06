import { requireJwt, normalizeEmail } from "../lib/auth.js";

export async function dashboardRoutes(app, { pool }) {
  app.get("/api/v1/docs/dashboard/summary", async (request, reply) => {
    const actor = requireJwt(request);
    const em = normalizeEmail(actor.email);

    const [myDrafts, scratchCount, changesRequested, pendingReview, pendingApproval, myWaiting] =
      await Promise.all([
        pool.query(
          `
            select count(*)::int as count from documents
            where state = 'draft' and zone = 'managed'
              and (author_email = $1 or created_by_email = $1)
          `,
          [em],
        ),
        pool.query(
          `
            select count(*)::int as count from documents
            where zone = 'scratch' and (author_email = $1 or created_by_email = $1)
          `,
          [em],
        ),
        pool.query(
          `
            select count(*)::int as count from documents
            where state = 'changes_requested'
              and (author_email = $1 or created_by_email = $1)
          `,
          [em],
        ),
        pool.query(
          `
            select count(*)::int as count from workflow_tasks t
            join documents d on d.id = t.document_id
            where t.assignee_email = $1 and t.status = 'pending' and t.role = 'reviewer'
          `,
          [em],
        ),
        pool.query(
          `
            select count(*)::int as count from workflow_tasks t
            join documents d on d.id = t.document_id
            where t.assignee_email = $1 and t.status = 'pending' and t.role = 'approver'
          `,
          [em],
        ),
        pool.query(
          `
            select count(*)::int as count from documents
            where state = 'in_review' and zone = 'managed'
              and (author_email = $1 or created_by_email = $1)
          `,
          [em],
        ),
      ]);

    return reply.send({
      myDrafts: myDrafts.rows[0]?.count ?? 0,
      scratchCount: scratchCount.rows[0]?.count ?? 0,
      changesRequested: changesRequested.rows[0]?.count ?? 0,
      pendingReview: pendingReview.rows[0]?.count ?? 0,
      pendingApproval: pendingApproval.rows[0]?.count ?? 0,
      myWaiting: myWaiting.rows[0]?.count ?? 0,
      pendingApprovals: pendingReview.rows[0]?.count ?? 0,
    });
  });
}
