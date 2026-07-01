import { env } from "../config.js";
import { getZohoAccessToken, loadRefreshToken } from "../services/zohoAuth.js";
import {
  fetchFolderMeta,
  fetchWorkdriveMe,
  listFolderItems,
  listTeamFolderItems,
  listTeamFolders,
} from "../services/workdrive.js";

function requireJwt(request) {
  const u = request.user;
  if (!u?.email) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return u;
}

function sendRouteError(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    error: err.code || err.message || "error",
    message: err.message,
    details: err.details || undefined,
  });
}

export async function workdriveBrowseRoutes(app, { pool }) {
  app.get("/api/v1/docs/workdrive/link-status", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      await loadRefreshToken(pool, actor.email);
      return reply.send({ ok: true, linked: true, email: actor.email });
    } catch (err) {
      if (err.statusCode === 412) {
        return reply.send({
          ok: true,
          linked: false,
          email: actor.email,
          tokenEncryptionConfigured: Boolean(env.tokenEncKeyB64),
          zohoOAuthConfigured: Boolean(env.zohoClientId && env.zohoClientSecret),
        });
      }
      return sendRouteError(reply, err);
    }
  });

  app.get("/api/v1/docs/workdrive/me", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const me = await fetchWorkdriveMe(accessToken);
      return reply.send({ ok: true, me });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  app.get("/api/v1/docs/workdrive/browse", async (request, reply) => {
    const actor = requireJwt(request);
    const folderId = String(request.query?.folderId ?? "").trim();
    const source = String(request.query?.source ?? "").trim().toLowerCase();

    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const me = await fetchWorkdriveMe(accessToken);
      const myFolderId = me.myFolderId;
      const warnings = [];

      if (!folderId) {
        const teamResult = await listTeamFolders(accessToken, me);
        warnings.push(...(teamResult.warnings || []));

        const roots = [];
        if (myFolderId) {
          roots.push({
            id: myFolderId,
            name: "My Folders",
            kind: "folder",
            source: "my",
            type: "root",
          });
        }
        for (const tf of teamResult.items) {
          roots.push({
            id: tf.id,
            name: tf.teamName ? `${tf.name} (${tf.teamName})` : tf.name,
            kind: "folder",
            source: "teamfolder",
            type: "teamfolder",
            teamId: tf.teamId || null,
          });
        }

        return reply.send({
          ok: true,
          view: "roots",
          folderId: null,
          folderName: "WorkDrive",
          parentId: null,
          source: null,
          myFolderId: myFolderId || null,
          items: roots,
          warnings,
          me: {
            email: me.email || actor.email,
            displayName: me.displayName,
          },
        });
      }

      const isTeam = source === "teamfolder";
      const listed = isTeam
        ? await listTeamFolderItems(accessToken, folderId)
        : await listFolderItems(accessToken, folderId);
      warnings.push(...(listed.warnings || []));

      const folderMeta = await fetchFolderMeta(accessToken, folderId);
      const folderName = folderMeta?.name || folderId;
      const parentId =
        folderMeta?.parentId && folderMeta.parentId !== folderId
          ? folderMeta.parentId
          : null;

      return reply.send({
        ok: true,
        view: "folder",
        myFolderId: myFolderId || null,
        folderId,
        folderName,
        parentId,
        source: isTeam ? "teamfolder" : "my",
        items: listed.items,
        warnings,
        me: {
          email: me.email || actor.email,
          displayName: me.displayName,
        },
      });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });
}
