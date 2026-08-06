import { env } from "../config.js";
import {
  createWorkdriveFolder,
  fetchFolderMeta,
  fetchWorkdriveMe,
  findChildFolderByName,
  listTeamFolders,
} from "./workdrive.js";
import { tenantConfigFromEmail, upsertTenant } from "./tenantStore.js";

/**
 * Resolve the parent Team Folder / workspace for this tenant's vault.
 * Prefer env/tenant config; never trust a bare "root" sentinel.
 */
async function resolveSharedParent(accessToken, me, tenantCfg) {
  const configured =
    String(tenantCfg.workdriveParentId || env.sharedParentFolderId || "").trim();
  if (configured && configured.toLowerCase() !== "root") {
    return configured;
  }

  const teams = await listTeamFolders(accessToken, me);
  if (tenantCfg.zohoTeamId) {
    const hit = teams.items.find((t) => t.teamId === tenantCfg.zohoTeamId);
    if (hit?.id) return hit.id;
  }
  if (teams.items[0]?.id) return teams.items[0].id;

  const e = new Error(
    "No Team Folder found for the vault. Set DOCQ_SHARED_PARENT_FOLDER_ID to your WorkDrive Team Folder id (service account must be Admin; do not add all org users as members).",
  );
  e.statusCode = 412;
  e.code = "shared_parent_missing";
  throw e;
}

async function folderAlive(accessToken, folderId) {
  if (!folderId) return false;
  const meta = await fetchFolderMeta(accessToken, folderId);
  return Boolean(meta?.id);
}

async function ensureNamedFolder(accessToken, parentId, folderName) {
  const existing = await findChildFolderByName(accessToken, parentId, folderName, {
    team: true,
  });
  if (existing?.id) return existing;

  try {
    return await createWorkdriveFolder(accessToken, {
      parentId,
      name: folderName,
    });
  } catch (err) {
    const again = await findChildFolderByName(accessToken, parentId, folderName, {
      team: true,
    });
    if (again?.id) return again;

    const e = new Error(
      err.message ||
        `Cannot create "${folderName}" under the vault Team Folder. Confirm DOCQ_SHARED_PARENT_FOLDER_ID and that the service Zoho account is Admin on that Team Folder.`,
    );
    e.statusCode = err.statusCode === 403 ? 403 : 502;
    e.code = "shared_folder_create_denied";
    e.details = err.details;
    throw e;
  }
}

/**
 * Ensure Managed vault folder (+ optional dump folder name) exist under the Team Folder.
 * Recreates children if WorkDrive folders were deleted but DB still held stale ids.
 *
 * Vault model: Team Folder members should be service-account only; end users get
 * per-file permissions, not Team Folder membership.
 *
 * @param {import("pg").Pool} pool
 * @param {string} accessToken
 * @param {string} actorEmail
 * @param {{ tenantId?: string, tenantName?: string } | null} [jwtUser]
 */
export async function ensureSharedLibrary(pool, accessToken, actorEmail, jwtUser) {
  const fromEmail = tenantConfigFromEmail(actorEmail);
  const cfg = {
    ...fromEmail,
    id: jwtUser?.tenantId || fromEmail.id,
    name: jwtUser?.tenantName || fromEmail.name,
  };

  const tenant = await upsertTenant(pool, cfg);
  const me = await fetchWorkdriveMe(accessToken);
  const parentId = await resolveSharedParent(accessToken, me, cfg);

  if (!(await folderAlive(accessToken, parentId))) {
    const e = new Error(
      `Vault parent Team Folder "${parentId}" is missing or inaccessible to the service account. Update DOCQ_SHARED_PARENT_FOLDER_ID and ensure the service account is a Team Folder Admin.`,
    );
    e.statusCode = 412;
    e.code = "shared_parent_missing";
    throw e;
  }

  const { rows: cached } = await pool.query(
    `select * from workdrive_library where tenant_id = $1 and parent_folder_id = $2`,
    [tenant.id, parentId],
  );

  let managedId =
    cached[0]?.managed_folder_id ||
    tenant.managed_folder_id ||
    env.managedRootFolderId ||
    null;
  let dumpId = cached[0]?.dump_folder_id || tenant.dump_folder_id || null;

  // If Zoho folders were deleted manually, cached ids go stale — recreate.
  if (managedId && !(await folderAlive(accessToken, managedId))) {
    managedId = null;
  }
  if (dumpId && !(await folderAlive(accessToken, dumpId))) {
    dumpId = null;
  }

  if (!managedId) {
    const folder = await ensureNamedFolder(accessToken, parentId, env.managedFolderName);
    managedId = folder.id;
  }
  if (!dumpId) {
    const folder = await ensureNamedFolder(accessToken, parentId, env.dumpFolderName);
    dumpId = folder.id;
  }

  await pool.query(
    `insert into workdrive_library (
       tenant_id, parent_folder_id, managed_folder_id, dump_folder_id, ensured_by_email, ensured_at
     ) values ($1, $2, $3, $4, $5, now())
     on conflict (tenant_id, parent_folder_id) do update set
       managed_folder_id = excluded.managed_folder_id,
       dump_folder_id = excluded.dump_folder_id,
       ensured_by_email = excluded.ensured_by_email,
       ensured_at = now()`,
    [tenant.id, parentId, managedId, dumpId, actorEmail],
  );

  await pool.query(
    `update tenants set
       workdrive_parent_id = $2,
       managed_folder_id = $3,
       dump_folder_id = $4,
       updated_at = now()
     where id = $1`,
    [tenant.id, parentId, managedId, dumpId],
  );

  // Drop obsolete cache rows (e.g. parent_folder_id = 'root') for this tenant.
  await pool.query(
    `delete from workdrive_library
     where tenant_id = $1 and parent_folder_id is distinct from $2`,
    [tenant.id, parentId],
  );

  return {
    tenantId: tenant.id,
    parentFolderId: parentId,
    managedFolderId: managedId,
    dumpFolderId: dumpId,
    created: true,
    me,
  };
}
