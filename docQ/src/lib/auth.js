export function requireJwt(request) {
  const u = request.user;
  if (!u?.email) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return u;
}

export function isDocAdmin(request) {
  return (
    Array.isArray(request.user?.allowedDocTypes) &&
    request.user.allowedDocTypes.includes("*")
  );
}

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function sendError(reply, err) {
  const code = err.statusCode || 500;
  try {
    reply.log?.error?.(
      {
        err: {
          message: err?.message,
          statusCode: code,
          detail: err?.detail,
          details: err?.details,
          code: err?.code,
        },
      },
      "docq request failed",
    );
  } catch {
    // ignore logging failures
  }
  return reply.code(code).send({
    error: err.message || "error",
    detail: err.detail || err.details || undefined,
    code: err.code || undefined,
  });
}
