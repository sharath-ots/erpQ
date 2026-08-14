import { env } from "../config.js";
import {
  createWorkdriveFolder,
  fetchFolderMeta,
  fetchWorkdriveMe,
  findChildFolderByName,
  listTeamFolders,
} from "./workdrive.js";
import { tenantConfigFromEmail, upsertTenant } from "./tenantStore.js";

function isZohoInvalidParent(err) {
  const details = err?.details;
  const errors = details?.errors;
  if (Array.isArray(errors) && errors.some((e) => String(e?.id) === "R602")) {
    return true;
  }
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("invalid parent");
}

/**
 * Resolve DOCQ_SHARED_PARENT_FOLDER_ID (or first team workspace).
 *
 * Prefer the **General** folder resource id (subfolder). A Team Folder / workspace
 * root id can list children but Zoho often rejects it as parent_id for create/upload (R602).
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
    "No Team Folder found for the vault. Set DOCQ_SHARED_PARENT_FOLDER_ID to the General folder id (open General in WorkDrive → copy folder id from the URL). Service account must be Team Folder Admin.",
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

    if (isZohoInvalidParent(err)) {
      const e = new Error(
        `Zoho R602 Invalid parent Id while creating "${folderName}". DOCQ_SHARED_PARENT_FOLDER_ID must be a real folder resource id (open General in WorkDrive and copy the folder id from the URL) — not the Team Folder root / parent-of-team id. Current parent="${parentId}".`,
      );
      e.statusCode = 502;
      e.code = "shared_folder_create_denied";
      e.details = err.details;
      throw e;
    }

    const e = new Error(
      err.message ||
        `Cannot create "${folderName}" under the vault. Confirm DOCQ_SHARED_PARENT_FOLDER_ID points at General (folder id) and the service Zoho account is Admin.`,
    );
    e.statusCode = err.statusCode === 403 ? 403 : 502;
    e.code = "shared_folder_create_denied";
    e.details = err.details;
    throw e;
  }
}

/**
 * Resolve where Org_Folder / Temp_Folder live.
 *
 * Canonical path: Team Folder → General → Org_Folder / Temp_Folder
 *
 * Zoho will not accept Team Folder root as parent_id for create (R602).
 * So if DOCQ_SHARED_PARENT_FOLDER_ID is the Team Folder, we only LOOK UP General
 * (never create under the Team Folder root). Prefer setting the env to General's id.
 */
async function resolveLibraryRoot(accessToken, configuredParentId) {
  const managedName = env.managedFolderName;
  const dumpName = env.dumpFolderName;
  const libraryName = String(env.vaultLibraryFolderName || "").trim();

  // Parent is already General (Org_Folder / Temp_Folder sit directly under it).
  const managedDirect = await findChildFolderByName(accessToken, configuredParentId, managedName, {
    team: true,
  });
  if (managedDirect?.id) return configuredParentId;

  const dumpDirect = await findChildFolderByName(accessToken, configuredParentId, dumpName, {
    team: true,
  });
  if (dumpDirect?.id) return configuredParentId;

  if (!libraryName) return configuredParentId;

  // Parent is Team Folder (or similar): find existing General by list — do not create here.
  const libraryExisting = await findChildFolderByName(
    accessToken,
    configuredParentId,
    libraryName,
    { team: true },
  );
  if (libraryExisting?.id) return libraryExisting.id;

  const e = new Error(
    `Folder "${libraryName}" not found under DOCQ_SHARED_PARENT_FOLDER_ID="${configuredParentId}". ` +
      `Open WorkDrive → Team Folder → ${libraryName}, copy that folder's id from the URL, and set DOCQ_SHARED_PARENT_FOLDER_ID to it ` +
      `(Zoho rejects Team Folder root as parent_id — error R602). Then Org_Folder / Temp_Folder live under General.`,
  );
  e.statusCode = 412;
  e.code = "shared_parent_missing";
  throw e;
}

/**
 * Ensure Managed vault folder (+ dump folder) exist under General.
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
  const configuredParentId = await resolveSharedParent(accessToken, me, cfg);

  if (!(await folderAlive(accessToken, configuredParentId))) {
    const e = new Error(
      `DOCQ_SHARED_PARENT_FOLDER_ID="${configuredParentId}" is missing or inaccessible to the service account. Use the General folder id from the WorkDrive URL, and keep the service account as Team Folder Admin.`,
    );
    e.statusCode = 412;
    e.code = "shared_parent_missing";
    throw e;
  }

  const libraryRootId = await resolveLibraryRoot(accessToken, configuredParentId);

  if (!(await folderAlive(accessToken, libraryRootId))) {
    const e = new Error(
      `Vault library folder "${libraryRootId}" (expected General) is inaccessible. Set DOCQ_SHARED_PARENT_FOLDER_ID to the General folder resource id.`,
    );
    e.statusCode = 412;
    e.code = "shared_parent_missing";
    throw e;
  }

  const { rows: cached } = await pool.query(
    `select * from workdrive_library where tenant_id = $1 and parent_folder_id = $2`,
    [tenant.id, libraryRootId],
  );

  let managedId =
    cached[0]?.managed_folder_id ||
    tenant.managed_folder_id ||
    env.managedRootFolderId ||
    null;
  let dumpId = cached[0]?.dump_folder_id || tenant.dump_folder_id || null;

  if (managedId && !(await folderAlive(accessToken, managedId))) {
    managedId = null;
  }
  if (dumpId && !(await folderAlive(accessToken, dumpId))) {
    dumpId = null;
  }

  if (!managedId) {
    const existing = await findChildFolderByName(accessToken, libraryRootId, env.managedFolderName, {
      team: true,
    });
    if (existing?.id) managedId = existing.id;
  }
  if (!dumpId) {
    const existing = await findChildFolderByName(accessToken, libraryRootId, env.dumpFolderName, {
      team: true,
    });
    if (existing?.id) dumpId = existing.id;
  }

  // Creates are safe here: libraryRootId is General (a subfolder), not Team Folder root.
  if (!managedId) {
    const folder = await ensureNamedFolder(accessToken, libraryRootId, env.managedFolderName);
    managedId = folder.id;
  }
  if (!dumpId) {
    const folder = await ensureNamedFolder(accessToken, libraryRootId, env.dumpFolderName);
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
    [tenant.id, libraryRootId, managedId, dumpId, actorEmail],
  );

  await pool.query(
    `update tenants set
       workdrive_parent_id = $2,
       managed_folder_id = $3,
       dump_folder_id = $4,
       updated_at = now()
     where id = $1`,
    [tenant.id, libraryRootId, managedId, dumpId],
  );

  await pool.query(
    `delete from workdrive_library
     where tenant_id = $1 and parent_folder_id is distinct from $2`,
    [tenant.id, libraryRootId],
  );

  return {
    tenantId: tenant.id,
    parentFolderId: libraryRootId,
    teamParentFolderId: configuredParentId,
    managedFolderId: managedId,
    dumpFolderId: dumpId,
    created: true,
    me,
  };
}
