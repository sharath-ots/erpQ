import { resolveAllowedDocTypesForEmail } from "../config.js";

/**
 * CityQ portal JWT (same shape as /internal/mint).
 * @param {import("fastify").FastifyReply} reply
 * @param {object} opts
 * @param {string} opts.sub
 * @param {string} opts.email
 * @param {string[]} [opts.allowedDocTypes] — if omitted, uses OAuth env defaults
 * @param {string} [opts.roles]
 * @param {string} [opts.zohoId]
 * @param {string} [opts.googleSub]
 * @param {string} [opts.tenantId]
 * @param {string} [opts.tenantName]
 * @param {string} [opts.zohoOrgId]
 */
export async function mintCityQAccessToken(reply, {
  sub,
  email,
  allowedDocTypes: allowedOverride,
  zohoId,
  googleSub,
  tenantId,
  tenantName,
  zohoOrgId,
  roles,
}) {
  const expiresIn = Number(process.env.JWT_EXPIRES_SEC ?? 3600);
  const allowedDocTypes = Array.isArray(allowedOverride)
    ? allowedOverride
    : resolveAllowedDocTypesForEmail(email);
  const token = await reply.jwtSign(
    {
      sub,
      email,
      allowedDocTypes,
      zohoId,
      googleSub,
      tenantId,
      tenantName,
      zohoOrgId,
      roles,
      frappeUserEmail: email,
    },
    { expiresIn },
  );
  return {
    token_type: "Bearer",
    access_token: token,
    expires_in: expiresIn,
  };
}
