import crypto from "node:crypto";
import { requireJwt, isDocAdmin, normalizeEmail, sendError } from "../lib/auth.js";
import { getServiceZohoAccessToken } from "../services/zohoAuth.js";
import { ensureSharedLibrary } from "../services/sharedLibrary.js";
import { createWorkdriveFolder, findChildFolderByName } from "../services/workdrive.js";
import { env } from "../config.js";

async function ensureProjectFolder(pool, actor, projectKey, projectName) {
  const serviceToken = await getServiceZohoAccessToken(pool);
  const serviceEmail = env.serviceZohoEmail || actor.email;
  const library = await ensureSharedLibrary(pool, serviceToken, serviceEmail, actor);
  const parentId = library.managedFolderId;
  const folderName = String(projectName || projectKey).trim().slice(0, 80);
  const existing = await findChildFolderByName(serviceToken, parentId, folderName, {
    team: true,
  });
  if (existing?.id) return existing;
  return createWorkdriveFolder(serviceToken, { parentId, name: folderName });
}

export async function projectsRoutes(app, { pool }) {
  app.get("/api/v1/docs/projects", async (request, reply) => {
    requireJwt(request);
    const activeOnly = request.query?.all !== "1" && request.query?.all !== "true";
    const { rows } = await pool.query(
      activeOnly
        ? `select * from projects where active = true order by name asc`
        : `select * from projects order by active desc, name asc`,
    );
    return reply.send({ projects: rows });
  });

  app.post("/api/v1/docs/projects", async (request, reply) => {
    const actor = requireJwt(request);
    if (!isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const name = String(request.body?.name || "").trim();
    let projectKey = String(request.body?.projectKey || request.body?.key || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!name) return reply.code(400).send({ error: "name_required" });
    if (!projectKey) {
      projectKey = name
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
    }
    const description = request.body?.description
      ? String(request.body.description).trim()
      : null;

    try {
      const folder = await ensureProjectFolder(pool, actor, projectKey, name);
      const id = crypto.randomUUID();
      const { rows } = await pool.query(
        `
          insert into projects(
            id, project_key, name, description, workdrive_folder_id,
            created_by_email, updated_by_email
          )
          values ($1,$2,$3,$4,$5,$6,$6)
          returning *
        `,
        [
          id,
          projectKey,
          name,
          description,
          folder.id,
          normalizeEmail(actor.email),
        ],
      );
      return reply.send({ ok: true, project: rows[0], workdrive: folder });
    } catch (e) {
      if (String(e.message || "").includes("unique") || e.code === "23505") {
        return reply.code(409).send({ error: "project_key_exists" });
      }
      return sendError(reply, e);
    }
  });

  app.put("/api/v1/docs/projects/:id", async (request, reply) => {
    const actor = requireJwt(request);
    if (!isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const id = String(request.params.id || "").trim();
    const { rows: existing } = await pool.query(`select * from projects where id = $1`, [id]);
    if (!existing[0]) return reply.code(404).send({ error: "not_found" });

    const name =
      request.body?.name !== undefined
        ? String(request.body.name).trim()
        : existing[0].name;
    const description =
      request.body?.description !== undefined
        ? request.body.description
          ? String(request.body.description).trim()
          : null
        : existing[0].description;
    const active =
      request.body?.active !== undefined
        ? Boolean(request.body.active)
        : existing[0].active;

    let folderId = existing[0].workdrive_folder_id;
    if (!folderId) {
      try {
        const folder = await ensureProjectFolder(
          pool,
          actor,
          existing[0].project_key,
          name,
        );
        folderId = folder.id;
      } catch (e) {
        return sendError(reply, e);
      }
    }

    const { rows } = await pool.query(
      `
        update projects set
          name = $2,
          description = $3,
          active = $4,
          workdrive_folder_id = coalesce($5, workdrive_folder_id),
          updated_by_email = $6,
          updated_at = now()
        where id = $1
        returning *
      `,
      [id, name, description, active, folderId, normalizeEmail(actor.email)],
    );
    return reply.send({ ok: true, project: rows[0] });
  });
}
