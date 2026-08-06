import { env } from "../config.js";
import { getZohoAccessToken, loadRefreshToken } from "../services/zohoAuth.js";
import { ensureSharedLibrary } from "../services/sharedLibrary.js";
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

/**
 * area=shared|personal|all
 * - shared: Team Folders + auto Managed Org / Shared Dump roots (org library)
 * - personal: My Folders only (drafts / rough work)
 * - all: both (default for backward compatibility)
 */
export async function workdriveBrowseRoutes(app, { pool }) {
  app.get("/api/v1/docs/workdrive/link-status", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      await loadRefreshToken(pool, actor.email);
      return reply.send({
        ok: true,
        linked: true,
        email: actor.email,
        tenantId: actor.tenantId || null,
      });
    } catch (err) {
      if (err.statusCode === 412) {
        return reply.send({
          ok: true,
          linked: false,
          email: actor.email,
          tenantId: actor.tenantId || null,
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
      return reply.send({ ok: true, me, tenantId: actor.tenantId || null });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  /** Ensure Managed Org Folder + Shared Dump Folder; return their ids. */
  app.post("/api/v1/docs/workdrive/shared/ensure", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const library = await ensureSharedLibrary(pool, accessToken, actor.email, actor);
      return reply.send({
        ok: true,
        tenantId: library.tenantId,
        parentFolderId: library.parentFolderId,
        managedFolderId: library.managedFolderId,
        dumpFolderId: library.dumpFolderId,
        created: library.created,
        folders: [
          {
            id: library.managedFolderId,
            name: env.managedFolderName,
            kind: "folder",
            source: "shared",
            role: "managed",
          },
          {
            id: library.dumpFolderId,
            name: env.dumpFolderName,
            kind: "folder",
            source: "shared",
            role: "dump",
          },
        ],
      });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  app.get("/api/v1/docs/workdrive/browse", async (request, reply) => {
    const actor = requireJwt(request);
    const folderId = String(request.query?.folderId ?? "").trim();
    const source = String(request.query?.source ?? "").trim().toLowerCase();
    const area = String(request.query?.area ?? "all").trim().toLowerCase();

    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const me = await fetchWorkdriveMe(accessToken);
      const myFolderId = me.myFolderId;
      const warnings = [];

      if (!folderId) {
        const roots = [];

        if (area === "personal" || area === "all") {
          if (myFolderId) {
            roots.push({
              id: myFolderId,
              name: "My Folders (personal drafts)",
              kind: "folder",
              source: "my",
              type: "root",
              area: "personal",
            });
          }
        }

        if (area === "shared" || area === "all") {
          try {
            const library = await ensureSharedLibrary(
              pool,
              accessToken,
              actor.email,
              actor,
            );
            roots.push({
              id: library.managedFolderId,
              name: env.managedFolderName,
              kind: "folder",
              source: "teamfolder",
              type: "managed",
              area: "shared",
              role: "managed",
            });
            roots.push({
              id: library.dumpFolderId,
              name: env.dumpFolderName,
              kind: "folder",
              source: "teamfolder",
              type: "dump",
              area: "shared",
              role: "dump",
            });
            // Also surface other team workspaces Zoho already grants (reflect WD perms)
            const teamResult = await listTeamFolders(accessToken, me);
            warnings.push(...(teamResult.warnings || []));
            for (const tf of teamResult.items) {
              if (
                tf.id === library.parentFolderId ||
                tf.id === library.managedFolderId ||
                tf.id === library.dumpFolderId
              ) {
                continue;
              }
              roots.push({
                id: tf.id,
                name: tf.teamName ? `${tf.name} (${tf.teamName})` : tf.name,
                kind: "folder",
                source: "teamfolder",
                type: "teamfolder",
                area: "shared",
                teamId: tf.teamId || null,
              });
            }
          } catch (err) {
            warnings.push({
              step: "shared_library",
              message: err.message,
              code: err.code,
            });
            // Fallback: list team folders without ensure
            const teamResult = await listTeamFolders(accessToken, me);
            warnings.push(...(teamResult.warnings || []));
            for (const tf of teamResult.items) {
              roots.push({
                id: tf.id,
                name: tf.teamName ? `${tf.name} (${tf.teamName})` : tf.name,
                kind: "folder",
                source: "teamfolder",
                type: "teamfolder",
                area: "shared",
                teamId: tf.teamId || null,
              });
            }
          }
        }

        return reply.send({
          ok: true,
          view: "roots",
          area,
          folderId: null,
          folderName: "WorkDrive",
          parentId: null,
          source: null,
          myFolderId: myFolderId || null,
          tenantId: actor.tenantId || null,
          items: roots,
          warnings,
          me: {
            email: me.email || actor.email,
            displayName: me.displayName,
          },
        });
      }

      const isTeam = source === "teamfolder" || source === "shared";
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
        area,
        myFolderId: myFolderId || null,
        tenantId: actor.tenantId || null,
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
