function requireJwt(request) {
  const u = request.user;
  if (!u?.email) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return u;
}

export async function dashboardRoutes(app, { pool }) {
  app.get("/api/v1/docs/dashboard/summary", async (request, reply) => {
    const actor = requireJwt(request);
    const byState = await pool.query(
      `
        select state, count(*)::int as count
        from documents
        group by state
        order by state asc
      `,
    );
    const myDrafts = await pool.query(
      `
        select count(*)::int as count
        from documents
        where state = 'draft' and created_by_email = $1
      `,
      [actor.email],
    );
    return reply.send({
      byState: byState.rows,
      myDrafts: myDrafts.rows[0]?.count ?? 0,
    });
  });
}

