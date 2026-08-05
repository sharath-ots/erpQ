import { requireJwt, normalizeEmail } from "../lib/auth.js";



export async function inboxRoutes(app, { pool }) {

  app.get("/api/v1/docs/inbox", async (request, reply) => {

    const actor = requireJwt(request);

    const em = normalizeEmail(actor.email);



    const pendingTasks = await pool.query(

      `

        select t.*, d.title, d.doc_type, d.state, d.zone, d.workdrive_permalink,

               d.author_email, d.submitted_at, d.updated_at as document_updated_at,

               d.workflow_stage, d.review_round

        from workflow_tasks t

        join documents d on d.id = t.document_id

        where t.assignee_email = $1 and t.status = 'pending'

        order by t.due_at asc nulls last, t.created_at asc

      `,

      [em],

    );



    const reviewTasks = pendingTasks.rows.filter((t) => t.role === "reviewer");

    const approvalTasks = pendingTasks.rows.filter((t) => t.role === "approver");



    const myDocs = await pool.query(

      `

        select *

        from documents

        where (author_email = $1 or created_by_email = $1)

          and zone = 'managed'

          and state in ('draft', 'changes_requested', 'in_review')

        order by updated_at desc

        limit 50

      `,

      [em],

    );



    return reply.send({

      pendingReviewTasks: reviewTasks,

      pendingApprovalTasks: approvalTasks,

      pendingApprovals: pendingTasks.rows,

      myActiveDocuments: myDocs.rows,

    });

  });

}


