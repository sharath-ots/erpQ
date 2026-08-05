import { normalizeEmail } from "../lib/auth.js";
import { getServiceZohoAccessToken } from "./zohoAuth.js";
import {
  createWorkdrivePermission,
  deleteWorkdrivePermission,
  workdriveRoleIdForPermission,
} from "./workdrive.js";

/**
 * Grant a Zoho user access to a vault file (personal share).
 * Team Folder membership is NOT used — vault stays service-account-only.
 *
 * @returns {Promise<string|null>} WorkDrive permission id
 */
export async function grantVaultFileAccess(pool, {
  resourceId,
  email,
  permission = "write",
}) {
  const em = normalizeEmail(email);
  if (!resourceId || !em) return null;
  const token = await getServiceZohoAccessToken(pool);
  const created = await createWorkdrivePermission(token, {
    resourceId,
    email: em,
    roleId: workdriveRoleIdForPermission(permission),
  });
  return created?.id || null;
}

/**
 * Best-effort revoke of a vault file permission.
 */
export async function revokeVaultFileAccess(pool, permissionId) {
  if (!permissionId) return;
  try {
    const token = await getServiceZohoAccessToken(pool);
    await deleteWorkdrivePermission(token, permissionId);
  } catch {
    // ignore — caller still clears app ACL
  }
}
