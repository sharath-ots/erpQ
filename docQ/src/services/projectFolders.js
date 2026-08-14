import { createWorkdriveFolder, findChildFolderByName } from "./workdrive.js";

/**
 * Find or create a folder by name under a WorkDrive parent (team/vault).
 */
export async function ensureNamedFolder(accessToken, parentId, folderName) {
  const name = String(folderName || "").trim().slice(0, 80);
  if (!parentId || !name) {
    const e = new Error("folder_parent_or_name_required");
    e.statusCode = 400;
    throw e;
  }

  const existing = await findChildFolderByName(accessToken, parentId, name, {
    team: true,
  });
  if (existing?.id) return existing;

  try {
    return await createWorkdriveFolder(accessToken, { parentId, name });
  } catch (err) {
    const again = await findChildFolderByName(accessToken, parentId, name, {
      team: true,
    });
    if (again?.id) return again;
    throw err;
  }
}

/**
 * Resolve display name for a doc-type folder (prefer admin label).
 * e.g. contract → "Contract", cad → "CAD"
 */
export function docTypeFolderName(docType, docTypeDef = null) {
  const label = docTypeDef?.label ? String(docTypeDef.label).trim() : "";
  if (label) return label.slice(0, 80);
  const key = String(docType || "general").trim() || "general";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Under a project folder, ensure a doc-type subfolder exists and return it.
 * Path: Org_Folder → {Project} → {DocType} → file
 *
 * @returns {Promise<{ id: string, name: string }>}
 */
export async function ensureProjectDocTypeFolder(
  accessToken,
  projectFolderId,
  docType,
  docTypeDef = null,
) {
  const folderName = docTypeFolderName(docType, docTypeDef);
  return ensureNamedFolder(accessToken, projectFolderId, folderName);
}
