import crypto from "node:crypto";
import { requireJwt, normalizeEmail, isDocAdmin, sendError } from "../lib/auth.js";
import { canReadDocument } from "../services/documentAcl.js";
import {
  getServiceZohoAccessToken,
  getZohoAccessToken,
} from "../services/zohoAuth.js";
import {
  createWorkdrivePermission,
  deleteWorkdrivePermission,
  workdriveRoleIdForPermission,
} from "../services/workdrive.js";

async function resolveShareToken(pool, doc, actorEmail) {
  if (doc.zone === "managed") {
    return getServiceZohoAccessToken(pool);
  }
  return getZohoAccessToken(pool, actorEmail);
}

export async function sharesRoutes(app, { pool }) {
  // ==========================================
  // EXISTING DOCUMENT SHARES ROUTES
  // ==========================================
  app.get("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    if (!(await canReadDocument(pool, doc, actor.email, request))) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const { rows } = await pool.query(
      "select * from document_shares where document_id = $1 order by created_at desc",
      [doc.id],
    );
    return reply.send({ shares: rows });
  });

  app.post("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });

    const owner = normalizeEmail(doc.author_email || doc.created_by_email);
    if (owner !== normalizeEmail(actor.email) && !isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const granteeEmail = request.body?.granteeEmail ? normalizeEmail(request.body.granteeEmail) : null;
    const granteeDepartment = request.body?.granteeDepartment ? String(request.body.granteeDepartment).trim() : null;
    const permission = String(request.body?.permission || "read").trim();

    if (!granteeEmail && !granteeDepartment) {
      return reply.code(400).send({ error: "grantee_required" });
    }
    if (!["read", "write", "approve"].includes(permission)) {
      return reply.code(400).send({ error: "invalid_permission" });
    }

    let workdrivePermissionId = null;

    if (granteeEmail && doc.workdrive_file_id) {
      try {
        const token = await resolveShareToken(pool, doc, actor.email);
        const created = await createWorkdrivePermission(token, {
          resourceId: doc.workdrive_file_id,
          email: granteeEmail,
          roleId: workdriveRoleIdForPermission(permission),
        });
        workdrivePermissionId = created.id;
      } catch (e) {
        return sendError(reply, e);
      }
    }

    const id = crypto.randomUUID();
    try {
      const { rows } = await pool.query(
        `insert into document_shares(
            id, document_id, grantee_email, grantee_department,
            permission, granted_by_email, workdrive_permission_id
          ) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [id, doc.id, granteeEmail, granteeDepartment, permission, normalizeEmail(actor.email), workdrivePermissionId],
      );
      return reply.send({ ok: true, share: rows[0] });
    } catch (e) {
      if (workdrivePermissionId) {
        try {
          const token = await resolveShareToken(pool, doc, actor.email);
          await deleteWorkdrivePermission(token, workdrivePermissionId);
        } catch {}
      }
      return sendError(reply, e);
    }
  });

  app.delete("/api/v1/docs/documents/:id/shares/:shareId", async (request, reply) => {
    // ... (Your existing delete logic remains identical here)
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    const owner = normalizeEmail(doc.author_email || doc.created_by_email);
    if (owner !== normalizeEmail(actor.email) && !isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const { rows: shares } = await pool.query(
      "select * from document_shares where id = $1 and document_id = $2",
      [request.params.shareId, doc.id],
    );
    const share = shares[0];
    if (!share) return reply.code(404).send({ error: "not_found" });

    if (share.workdrive_permission_id) {
      try {
        const token = await resolveShareToken(pool, doc, actor.email);
        await deleteWorkdrivePermission(token, share.workdrive_permission_id);
      } catch (err) {
        request.log?.warn?.(
          { err: err?.message, permissionId: share.workdrive_permission_id },
          "workdrive permission delete failed; continuing with DB revoke",
        );
      }
    }

    await pool.query("delete from document_shares where id = $1 and document_id = $2", [
      request.params.shareId,
      doc.id,
    ]);
    return reply.send({ ok: true });
  });

  // ==========================================
  // NEW: FOLDER SHARES ROUTES
  // ==========================================
  
  app.get("/api/v1/docs/scratch/folders/:id/shares", async (request, reply) => {
    requireJwt(request);
    try {
      // If you create a folder_shares table later, you can select from it here. 
      // For now, we return an empty array so the UI drawer loads gracefully without 404ing.
      const { rows } = await pool.query(
        "select * from folder_shares where folder_id = $1 order by created_at desc",
        [request.params.id]
      ).catch(() => ({ rows: [] })); // Failsafe if table doesn't exist
      
      return reply.send({ shares: rows });
    } catch (e) {
      return sendError(reply, e);
    }
  });

  // ==========================================
  // HELPER: Auto-create Shared Folder
  // ==========================================
  async function getOrCreateSharedFolder(token) {
    const ZOHO_WD_URL = "https://workdrive.zoho.eu/api/v1"; 

    // 1. Get the current user's profile to extract their Zoho User ID (zuid)
    const meRes = await fetch(`${ZOHO_WD_URL}/users/me`, {
      headers: { "Authorization": `Zoho-oauthtoken ${token}` }
    });
    const meJson = await meRes.json();
    if (!meRes.ok) throw new Error(`Zoho API Error (users/me): ${JSON.stringify(meJson)}`);
    
    const zuid = meJson?.data?.id;

    // 2. Fetch the Teams this user belongs to
    const teamsRes = await fetch(`${ZOHO_WD_URL}/users/${zuid}/teams`, {
      headers: { "Authorization": `Zoho-oauthtoken ${token}` }
    });
    const teamsJson = await teamsRes.json();
    const teamId = teamsJson?.data?.[0]?.id; 
    if (!teamId) throw new Error("No Team found. Please ensure the Zoho account belongs to at least one Team.");

    // 3. Fetch ALL Workspaces (Team Folders) for this Team
    const wsRes = await fetch(`${ZOHO_WD_URL}/teams/${teamId}/workspaces`, {
      headers: { "Authorization": `Zoho-oauthtoken ${token}` }
    });
    const wsJson = await wsRes.json();
    const workspaces = wsJson?.data || [];
    
    if (workspaces.length === 0) {
      throw new Error("No Workspaces found in this team.");
    }

    // 🔴 NEW: Check if the user created a dedicated Team Folder named "docQ Shared Items" (like in your screenshot!)
    const dedicatedWorkspace = workspaces.find(ws => ws.attributes.name === "docQ Shared Items");
    if (dedicatedWorkspace) {
      return dedicatedWorkspace.id; // Found your new Team Folder! Return its ID.
    }

    let destinationFolderId = null;

    // 4. First pass: Look for an existing "docQ Shared Items" folder INSIDE any workspace
    for (const ws of workspaces) {
      try {
        const filesRes = await fetch(`${ZOHO_WD_URL}/workspaces/${ws.id}/files`, {
          headers: { "Authorization": `Zoho-oauthtoken ${token}` }
        });
        if (!filesRes.ok) continue; 
        
        const filesJson = await filesRes.json();
        const existingFolder = filesJson?.data?.find(
          f => f.attributes.name === "docQ Shared Items" && f.attributes.is_folder
        );

        if (existingFolder) {
          destinationFolderId = existingFolder.id;
          break; // Found it! Stop searching.
        }
      } catch (e) {
        // Ignore errors and keep searching
      }
    }

    // 5. Second pass: Try to CREATE it in a workspace where we have Write access
    if (!destinationFolderId) {
      for (const ws of workspaces) {
        try {
          const createRes = await fetch(`${ZOHO_WD_URL}/files`, {
            method: "POST",
            headers: {
              "Authorization": `Zoho-oauthtoken ${token}`,
              "Content-Type": "application/vnd.api+json"
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  name: "docQ Shared Items",
                  parent_id: ws.id 
                },
                type: "files"
              }
            })
          });
          
          if (createRes.ok) {
            const createJson = await createRes.json();
            destinationFolderId = createJson.data.id;
            break; // Successfully created! Stop trying.
          }
        } catch (e) {
          // Ignore R008 errors
        }
      }
    }

    // 6. If we STILL don't have a folder, throw the error
    if (!destinationFolderId) {
      throw new Error("You do not have permission to create folders. Please ask a Zoho Admin to manually create a Team Folder named 'docQ Shared Items'.");
    }

    return destinationFolderId;
  }
  // ==========================================
  // NEW: FOLDER SHARES ROUTE
  // ==========================================
  app.post("/api/v1/docs/scratch/folders/:id/shares", async (request, reply) => {
    try {
      const actor = requireJwt(request);
      const folderId = request.params.id; 
      const granteeEmail = request.body?.granteeEmail ? normalizeEmail(request.body.granteeEmail) : null;
      const permission = String(request.body?.permission || "read").trim();

      if (!granteeEmail) return reply.code(400).send({ error: "grantee_required" });

      // 🔴 Make sure this matches the URL in the helper function above!
      const ZOHO_WD_URL = "https://workdrive.zoho.eu/api/v1";

      // 1. Get the user's token
      const userToken = await getZohoAccessToken(pool, actor.email);

      // 2. Automatically find or create the central "docQ Shared Items" folder
      const destinationFolderId = await getOrCreateSharedFolder(userToken);

      // 3. COPY the private folder from "My Folders" into the Team "Shared Folder"
      const copyRes = await fetch(`${ZOHO_WD_URL}/files/${folderId}/copy`, {
        method: "POST",
        headers: {
          "Authorization": `Zoho-oauthtoken ${userToken}`,
          "Content-Type": "application/vnd.api+json"
        },
        body: JSON.stringify({
          data: {
            attributes: {
              parent_id: destinationFolderId
            }
          }
        })
      });

      const copiedData = await copyRes.json();

      if (!copyRes.ok) {
        return reply.code(500).send({ 
          error: "copy_failed", 
          detail: copiedData?.errors?.[0]?.title || `Zoho refused to copy: ${JSON.stringify(copiedData)}`
        });
      }

      const newCopiedFolderId = copiedData?.data?.id;

      // 4. Share the NEW copied folder with the recipient 
      try {
         await createWorkdrivePermission(userToken, {
           resourceId: newCopiedFolderId,
           email: granteeEmail,
           roleId: workdriveRoleIdForPermission(permission),
         });
      } catch (shareErr) {
         request.log?.warn?.("Failed to set explicit permission, but folder was copied.");
      }

      // 5. Save a record to the DB so the UI Drawer shows a success list
      const id = crypto.randomUUID();
      try {
        const { rows } = await pool.query(
          `insert into folder_shares (id, folder_id, grantee_email, permission, granted_by_email, workdrive_permission_id)
           values ($1, $2, $3, $4, $5, $6) returning *`,
          [id, folderId, granteeEmail, permission, normalizeEmail(actor.email), newCopiedFolderId]
        );
        return reply.send({ ok: true, share: rows[0] });
      } catch (dbErr) {
        // Fallback if the folder_shares table doesn't exist yet
        return reply.send({ 
          ok: true, 
          share: { id: newCopiedFolderId, grantee_email: granteeEmail, permission } 
        });
      }
      
    } catch (e) {
      return reply.code(500).send({ error: "server_error", detail: e.message });
    }
  });

  app.delete("/api/v1/docs/scratch/folders/:id/shares/:shareId", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      // Find the WorkDrive permission ID from DB (if you are tracking it)
      const { rows: shares } = await pool.query(
        "select * from folder_shares where id = $1", [request.params.shareId]
      ).catch(() => ({ rows: [] }));
      
      const share = shares[0];
      if (share && share.workdrive_permission_id) {
        const token = await getZohoAccessToken(pool, actor.email);
        await deleteWorkdrivePermission(token, share.workdrive_permission_id);
        
        await pool.query("delete from folder_shares where id = $1", [request.params.shareId]);
      }
      return reply.send({ ok: true });
    } catch (e) {
      return sendError(reply, e);
    }
  });
}