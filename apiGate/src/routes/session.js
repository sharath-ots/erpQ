import { env } from "../config.js";
import { getCoreModulesCached } from "../services/coreSettings.js";
import { resolveAllowedDocTypes } from "../auth/access.js";
import { setFrappeSidForUser } from "../services/frappeSessionStore.js";
import { getFrappeSidForUser } from "../services/frappeSessionStore.js";
import { frappePasswordLogin } from "@cityq/frapperestq";

async function mintViaAuthQ(body) {
  const res = await fetch(`${env.authqUrl}/internal/mint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CityQ-Internal-Key": env.internalServiceKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`authQ mint failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function mintLocal(app, reply, payload) {
  const signed = await reply.jwtSign(payload, { expiresIn: env.jwtExpiresSec });
  return { access_token: signed, expires_in: env.jwtExpiresSec };
}

export async function registerSessionRoutes(app) {
  app.post("/api/v1/auth/login", async (request, reply) => {
    const email =
      request.body?.email?.trim() ||
      request.body?.usr?.trim() ||
      "";
    const password = request.body?.password ?? request.body?.pwd ?? "";
    if (!email) {
      return reply.code(400).send({ error: "email_or_usr required" });
    }

    const modules = await getCoreModulesCached();
    const erpOn = modules.modules?.erp === true;
    const erpnextConfigured = Boolean(env.erpnextUrl?.trim());
    /** ERPNext user DB auth when core enables ERP or when ERPNEXT_URL is set (docker / first integration). */
    const requireErpPassword = erpOn || erpnextConfigured;

    let allowedDocTypes = [];

    if (requireErpPassword) {
      if (!password) {
        return reply.code(400).send({
          error: "password_required_for_erp_login",
          detail:
            "Password is required to authenticate against ERPNext (set ERPNEXT_URL on apiGate).",
        });
      }
      if (!erpnextConfigured) {
        return reply.code(503).send({ error: "erp_not_configured" });
      }
      try {
        const { cookie } = await frappePasswordLogin({
          baseUrl: env.erpnextUrl,
          usr: email,
          pwd: password,
        });
        setFrappeSidForUser(email, cookie);
        allowedDocTypes = resolveAllowedDocTypes(email);
      } catch (e) {
        return reply
          .code(401)
          .send({ error: "erp_login_failed", detail: String(e) });
      }
    }

    const payload = {
      sub: email,
      email,
      allowedDocTypes,
      frappeUserEmail: email,
    };

    let token;
    try {
      token = await mintViaAuthQ({
        sub: payload.sub,
        email: payload.email,
        allowedDocTypes: payload.allowedDocTypes,
      });
    } catch (e) {
      if (env.devInsecureLogin) {
        token = await mintLocal(app, reply, payload);
      } else {
        return reply
          .code(502)
          .send({ error: "authq_unavailable", detail: String(e) });
      }
    }

    reply.header(
      "Set-Cookie",
      `cityq_access_token=${encodeURIComponent(token.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token.expires_in}`,
    );

    return {
      token_type: "Bearer",
      access_token: token.access_token,
      expires_in: token.expires_in,
    };
  });

  app.get(
    "/api/v1/me",
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.code(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request) => {
      const user = request.user;
      const core = await getCoreModulesCached();
      const sid = getFrappeSidForUser(user.email);
      return {
        sub: user.sub,
        email: user.email,
        allowedDocTypes: user.allowedDocTypes,
        modules: core.modules,
        integrations: core.integrations ?? {},
        erp_session: Boolean(sid),
      };
    },
  );

  app.post("/api/v1/auth/logout", async (_request, reply) => {
    reply.header(
      "Set-Cookie",
      "cityq_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    return { ok: true };
  });
}
