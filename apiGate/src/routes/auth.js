import { env } from "../config.js";
import {
  fetchZohoUserInfo,
  zohoPrimaryEmail,
  ZohoAuthError,
} from "../auth/zoho.js";
import { resolveAllowedDocTypes } from "../auth/access.js";

export async function registerAuthRoutes(app) {
  app.post(
    "/api/v1/auth/zoho/exchange",
    async (request, reply) => {
      const token = request.body?.access_token?.trim();
      if (!token) {
        return reply.code(400).send({ error: "access_token required" });
      }
      let profile;
      try {
        profile = await fetchZohoUserInfo(
          token,
          env.zohoAccountsBase,
          env.zohoUserinfoPath,
        );
      } catch (e) {
        if (e instanceof ZohoAuthError) {
          return reply
            .code(401)
            .send({ error: "zoho_token_invalid", detail: e.message });
        }
        throw e;
      }

      const email = zohoPrimaryEmail(profile);
      const allowedDocTypes = resolveAllowedDocTypes(email);
      const payload = {
        sub: email,
        email,
        zohoId: typeof profile.ZUID === "string" ? profile.ZUID : undefined,
        allowedDocTypes,
        frappeUserEmail: env.erpnextUserEmailFromZoho ? email : undefined,
      };

      const signed = await reply.jwtSign(payload, {
        expiresIn: env.jwtExpiresSec,
      });

      return {
        token_type: "Bearer",
        access_token: signed,
        expires_in: env.jwtExpiresSec,
        scope: allowedDocTypes.join(","),
      };
    },
  );
}
