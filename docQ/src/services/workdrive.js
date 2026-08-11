import crypto from "node:crypto";
import { env } from "../config.js";

function apiRoot() {
  return env.workdriveApiBase.replace(/\/$/, "");
}

/** @returns {string} e.g. com, eu, in */
function workdriveRegion() {
  const base = apiRoot().toLowerCase();
  const m =
    base.match(/zohoapis\.([a-z.]+)/i) ||
    base.match(/workdrive\.zoho\.([a-z.]+)/i) ||
    base.match(/upload\.zoho\.([a-z.]+)/i);
  if (m?.[1]) return m[1].replace(/\.$/, "") || "com";
  return "com";
}

function legacyWorkdriveRoot() {
  return `https://workdrive.zoho.${workdriveRegion()}`;
}

function uploadStreamRoot() {
  return `https://upload.zoho.${workdriveRegion()}`;
}

function workdriveHeaders(accessToken) {
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    Accept: "application/vnd.api+json",
  };
}

function dataArray(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (json?.data && typeof json.data === "object") return [json.data];
  return [];
}

async function workdriveGet(accessToken, path, query) {
  const u = new URL(`${apiRoot()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
    }
  }
  const res = await fetch(u, { headers: workdriveHeaders(accessToken) });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    const e = new Error("workdrive_response_invalid");
    e.statusCode = 502;
    throw e;
  }
  if (!res.ok) {
    const e = new Error(
      json?.message || json?.errors?.[0]?.title || `workdrive_http_${res.status}`,
    );
    e.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    e.details = json;
    throw e;
  }
  return json;
}

async function workdriveTryGet(accessToken, path, query) {
  try {
    const json = await workdriveGet(accessToken, path, query);
    return { ok: true, json };
  } catch (err) {
    return { ok: false, error: err.message, details: err.details };
  }
}

/** Optional API probes that may 404/405 on some Zoho DCs — not a user-facing error. */
function isOptionalProbeFailure(message) {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("invalid method") ||
    m.includes("url rule not configured") ||
    m.includes("not found") ||
    m.includes("http_404") ||
    m.includes("http_405")
  );
}

function pushWarning(warnings, step, message, { hasItems = false } = {}) {
  if (hasItems || !message || isOptionalProbeFailure(message)) return;
  warnings.push({ step, message });
}

/**
 * @param {unknown} entry
 */
export function mapWorkdriveResource(entry) {
  if (!entry || typeof entry !== "object") return null;
  const attrs = entry.attributes || {};
  const resourceType = String(entry.type || "").toLowerCase();
  const attrType = String(attrs.type || attrs.resource_type || "").toLowerCase();
  const name =
    attrs.name ||
    attrs.file_name ||
    attrs.display_name ||
    attrs.folder_name ||
    entry.id ||
    "—";
  const isFolder =
    attrType === "folder" ||
    resourceType.includes("folder") ||
    resourceType === "workspace" ||
    attrs.is_folder === true;
  return {
    id: entry.id,
    name: String(name),
    kind: isFolder ? "folder" : "file",
    type: entry.type || null,
    parentId: attrs.parent_id || attrs.parentId || null,
    permalink: attrs.Permalink || attrs.permalink || attrs.web_url || null,
    modifiedTime:
      attrs.modified_time ||
      attrs.modifiedTime ||
      attrs.last_modified_time ||
      null,
    size: attrs.size ?? attrs.file_size ?? null,
    extension: attrs.extn || attrs.extension || null,
  };
}

function mapList(json) {
  return dataArray(json).map(mapWorkdriveResource).filter(Boolean);
}

/**
 * Zoho Team editions often omit attributes.myfolder_id; personal root is the
 * user's privatespace resource (id typically starts with "ppo").
 */
async function fetchPrivateSpaceId(accessToken, zuid) {
  const paths = [];
  if (zuid) {
    paths.push(`/workdrive/api/v1/users/${encodeURIComponent(zuid)}/privatespace`);
  }
  paths.push("/workdrive/api/v1/users/me/privatespace");
  for (const path of paths) {
    const r = await workdriveTryGet(accessToken, path);
    if (!r.ok) continue;
    const row = dataArray(r.json)[0] || r.json?.data;
    if (row?.id) return String(row.id);
  }
  return null;
}

export function isPrivateSpaceId(id) {
  return typeof id === "string" && /^ppo/i.test(id.trim());
}

export async function fetchWorkdriveMe(accessToken) {
  const json = await workdriveGet(accessToken, "/workdrive/api/v1/users/me");
  const row = dataArray(json)[0] || json?.data;
  const attrs = row?.attributes || {};
  const zuid = attrs.zuid || attrs.ZUID || attrs.zoho_user_id || row?.id || null;
  let myFolderId = attrs.myfolder_id || attrs.my_folder_id || null;
  if (!myFolderId) {
    myFolderId = await fetchPrivateSpaceId(accessToken, zuid);
  }
  return {
    userId: row?.id || null,
    zuid,
    email: attrs.email_id || attrs.email || null,
    displayName: attrs.display_name || attrs.name || null,
    myFolderId,
    preferredTeamId:
      attrs.preferred_team_id || attrs.team_id || attrs.default_team_id || null,
    raw: row || null,
  };
}

async function listUserTeams(accessToken, me) {
  const page = { "page[limit]": "50", "page[offset]": "0" };
  const attempts = [];

  if (me.zuid) {
    attempts.push(`/workdrive/api/v1/users/${encodeURIComponent(me.zuid)}/teams`);
  }
  attempts.push("/workdrive/api/v1/teams");

  for (const path of attempts) {
    const r = await workdriveTryGet(accessToken, path, page);
    if (r.ok && dataArray(r.json).length) {
      return dataArray(r.json).map((entry) => {
        const mapped = mapWorkdriveResource(entry);
        return mapped ? { id: entry.id, name: mapped.name } : null;
      }).filter(Boolean);
    }
  }

  if (me.preferredTeamId) {
    return [{ id: me.preferredTeamId, name: "Team" }];
  }
  return [];
}

async function listTeamWorkspaces(accessToken, teamId) {
  const page = { "page[limit]": "100", "page[offset]": "0" };
  // Team folders are "workspaces" under a team — there is no GET /teamfolders list API.
  const r = await workdriveTryGet(
    accessToken,
    `/workdrive/api/v1/teams/${encodeURIComponent(teamId)}/workspaces`,
    page,
  );
  if (r.ok && dataArray(r.json).length) {
    return mapList(r.json).map((item) => ({
      ...item,
      kind: "folder",
      source: "teamfolder",
      teamId,
    }));
  }
  return [];
}

export async function listTeamFolders(accessToken, me) {
  const warnings = [];
  const byId = new Map();

  try {
    const teams = await listUserTeams(accessToken, me);
    for (const team of teams) {
      const workspaces = await listTeamWorkspaces(accessToken, team.id);
      for (const ws of workspaces) {
        byId.set(ws.id, { ...ws, name: ws.name, teamId: team.id, teamName: team.name });
      }
    }
    if (!teams.length && !byId.size) {
      pushWarning(warnings, "teams", "No teams returned for this WorkDrive account");
    }
  } catch (err) {
    pushWarning(warnings, "teams_workspaces", String(err?.message ?? err));
  }

  return {
    items: sortBrowseItems([...byId.values()]),
    warnings: byId.size ? [] : warnings,
  };
}

async function listResources(accessToken, folderId, suffix) {
  const json = await workdriveGet(
    accessToken,
    `/workdrive/api/v1/files/${encodeURIComponent(folderId)}/${suffix}`,
    { "page[limit]": "100", "page[offset]": "0" },
  );
  return mapList(json);
}

async function listPrivateSpaceItems(accessToken, privateSpaceId) {
  const warnings = [];
  const byId = new Map();
  for (const suffix of ["folders", "files"]) {
    const r = await workdriveTryGet(
      accessToken,
      `/workdrive/api/v1/privatespace/${encodeURIComponent(privateSpaceId)}/${suffix}`,
      { "page[limit]": "100", "page[offset]": "0" },
    );
    if (r.ok) {
      for (const item of mapList(r.json)) {
        if (item?.id) byId.set(item.id, { ...item, source: "my" });
      }
    } else {
      pushWarning(warnings, `privatespace/${suffix}`, r.error);
    }
  }
  const items = sortBrowseItems([...byId.values()]);
  return { items, warnings: items.length ? [] : warnings };
}

export async function listFolderItems(accessToken, folderId) {
  if (isPrivateSpaceId(folderId)) {
    return listPrivateSpaceItems(accessToken, folderId);
  }

  const warnings = [];
  const byId = new Map();

  for (const suffix of ["folders", "files"]) {
    const r = await workdriveTryGet(
      accessToken,
      `/workdrive/api/v1/files/${encodeURIComponent(folderId)}/${suffix}`,
      { "page[limit]": "100", "page[offset]": "0" },
    );
    if (r.ok) {
      for (const item of mapList(r.json)) {
        if (item?.id) byId.set(item.id, item);
      }
    } else {
      pushWarning(warnings, `files/${suffix}`, r.error);
    }
  }

  const items = sortBrowseItems([...byId.values()]);
  return {
    items,
    warnings: items.length ? [] : warnings,
  };
}

function sortBrowseItems(items) {
  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), undefined, {
      sensitivity: "base",
    });
  });
}

/** Contents of a team folder / workspace. */
export async function listTeamFolderItems(accessToken, teamFolderId) {
  const warnings = [];
  const byId = new Map();

  const attempts = [
    `/workdrive/api/v1/teamfolders/${encodeURIComponent(teamFolderId)}/folders`,
    `/workdrive/api/v1/teamfolders/${encodeURIComponent(teamFolderId)}/files`,
    `/workdrive/api/v1/files/${encodeURIComponent(teamFolderId)}/folders`,
    `/workdrive/api/v1/files/${encodeURIComponent(teamFolderId)}/files`,
  ];

  for (const path of attempts) {
    const r = await workdriveTryGet(accessToken, path, {
      "page[limit]": "100",
      "page[offset]": "0",
    });
    if (!r.ok) {
      pushWarning(warnings, path, r.error);
      continue;
    }
    for (const item of mapList(r.json)) {
      if (!item?.id) continue;
      byId.set(item.id, { ...item, source: "teamfolder" });
    }
  }

  const items = sortBrowseItems([...byId.values()]);
  return { items, warnings: items.length ? [] : warnings };
}

export async function fetchFolderMeta(accessToken, folderId) {
  for (const path of [
    `/workdrive/api/v1/files/${encodeURIComponent(folderId)}`,
    `/workdrive/api/v1/teamfolders/${encodeURIComponent(folderId)}`,
    `/workdrive/api/v1/workspaces/${encodeURIComponent(folderId)}`,
  ]) {
    const r = await workdriveTryGet(accessToken, path);
    if (!r.ok) continue;
    const row = dataArray(r.json)[0] || r.json?.data;
    const mapped = mapWorkdriveResource(row);
    if (mapped?.name) return mapped;
  }
  return null;
}

function parseUploadResponse(json, filename) {
  const row = dataArray(json)[0] || json?.data || json;
  const mapped = mapWorkdriveResource(row);
  if (mapped?.id) return { ...mapped, raw: row };

  const attrs = row?.attributes || {};
  const id =
    row?.id ||
    attrs.resource_id ||
    attrs.file_id ||
    attrs.id ||
    null;
  if (id) {
    return {
      id: String(id),
      name: filename,
      kind: "file",
      permalink: attrs.Permalink || attrs.permalink || attrs.web_url || null,
      raw: row,
    };
  }
  return null;
}

async function readUploadJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

function buildMultipartUpload(parentId, filename, buffer, contentType) {
  const form = new FormData();
  form.append("parent_id", parentId);
  form.append("filename", filename);
  form.append(
    "content",
    new Blob([buffer], { type: contentType }),
    filename,
  );
  return form;
}

/**
 * Upload a file buffer to WorkDrive under parentId (folder).
 * Tries DC-specific stream + multipart endpoints (EU uses upload.zoho.eu headers).
 */
export async function uploadWorkdriveFile(accessToken, {
  parentId,
  filename,
  buffer,
  contentType = "application/octet-stream",
}) {
  if (!parentId) {
    const e = new Error("parent_folder_required");
    e.statusCode = 400;
    throw e;
  }

  const region = workdriveRegion();
  const auth = { Authorization: `Zoho-oauthtoken ${accessToken}` };
  let lastErr = null;

  // Stream upload (required for EU; also works on other DCs).
  try {
    const res = await fetch(
      `${uploadStreamRoot()}/workdrive-api/v1/stream/upload`,
      {
        method: "POST",
        headers: {
          ...auth,
          "Content-Type": contentType,
          "x-filename": encodeURIComponent(filename),
          "x-parent_id": parentId,
          "upload-id": crypto.randomUUID(),
          "x-streammode": "1",
          "override-name-exist": "true",
        },
        body: buffer,
      },
    );
    const json = await readUploadJson(res);
    if (res.ok) {
      const parsed = parseUploadResponse(json, filename);
      if (parsed) return parsed;
      lastErr = new Error("upload_response_missing_id");
    } else {
      lastErr = new Error(
        json?.message || json?.errors?.[0]?.title || `upload_stream_http_${res.status}`,
      );
    }
  } catch (err) {
    lastErr = err;
  }

  const multipartAttempts = [
    {
      url: `${legacyWorkdriveRoot()}/api/v1/upload`,
      query: new URLSearchParams({
        filename: encodeURIComponent(filename),
        parent_id: parentId,
        "override-name-exist": "true",
      }),
    },
    {
      url: `${apiRoot()}/workdrive/api/v1/upload`,
      query: null,
    },
  ];

  for (const attempt of multipartAttempts) {
    try {
      const target = attempt.query
        ? `${attempt.url}?${attempt.query}`
        : attempt.url;
      const res = await fetch(target, {
        method: "POST",
        headers: auth,
        body: buildMultipartUpload(parentId, filename, buffer, contentType),
      });
      const json = await readUploadJson(res);
      if (!res.ok) {
        lastErr = new Error(
          json?.message || json?.errors?.[0]?.title || `upload_http_${res.status}`,
        );
        continue;
      }
      const parsed = parseUploadResponse(json, filename);
      if (parsed) return parsed;
      lastErr = new Error("upload_response_missing_id");
    } catch (err) {
      lastErr = err;
    }
  }

  const e = lastErr || new Error("workdrive_upload_failed");
  e.statusCode = 502;
  e.detail = region !== "com"
    ? `WorkDrive upload failed for ${region} DC. Ensure OAuth scopes include WorkDrive.files.CREATE and re-consent Zoho login.`
    : "WorkDrive upload failed. Ensure OAuth scopes include WorkDrive.files.CREATE and re-consent Zoho login.";
  throw e;
}

export async function ensureScratchFolder(accessToken, me, configuredRootId, options = {}) {
  if (configuredRootId) return configuredRootId;
  if (me.myFolderId) return me.myFolderId;
  if (options.dumpFolderId) return options.dumpFolderId;
  const e = new Error(
    "No personal WorkDrive folder for this account. Set DOCQ_SCRATCH_ROOT in .env.lan or open Shared WorkDrive once so the Shared Dump folder is created.",
  );
  e.statusCode = 412;
  e.code = "scratch_folder_not_configured";
  throw e;
}

/**
 * Download file bytes from WorkDrive (used when promoting dump → managed).
 * @returns {Promise<{ buffer: Buffer, contentType: string, filename: string }>}
 */
export async function downloadWorkdriveFile(accessToken, fileId) {
  if (!fileId) {
    const e = new Error("file_id_required");
    e.statusCode = 400;
    throw e;
  }

  const attempts = [
    `${apiRoot()}/workdrive/api/v1/download/${encodeURIComponent(fileId)}`,
    `${legacyWorkdriveRoot()}/api/v1/download/${encodeURIComponent(fileId)}`,
  ];

  let lastErr = null;
  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          Accept: "*/*",
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = new Error(text || `download_http_${res.status}`);
        lastErr.statusCode = res.status;
        continue;
      }
      const ab = await res.arrayBuffer();
      const buffer = Buffer.from(ab);
      const contentType =
        res.headers.get("content-type") || "application/octet-stream";
      const disposition = res.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      const filename = nameMatch
        ? decodeURIComponent(nameMatch[1].trim())
        : "download.bin";
      return { buffer, contentType, filename };
    } catch (err) {
      lastErr = err;
    }
  }

  const e = lastErr || new Error("workdrive_download_failed");
  e.statusCode = e.statusCode || 502;
  throw e;
}

/** Map docQ share permission → WorkDrive file role_id. */
export function workdriveRoleIdForPermission(permission) {
  const p = String(permission || "read").toLowerCase();
  if (p === "write" || p === "approve") return "5"; // Edit
  return "34"; // View
}

/**
 * Create a personal (email) permission on a WorkDrive file/folder.
 * @returns {Promise<{ id: string }>}
 */
export async function createWorkdrivePermission(accessToken, {
  resourceId,
  email,
  roleId,
}) {
  if (!resourceId || !email) {
    const e = new Error("resource_id_and_email_required");
    e.statusCode = 400;
    throw e;
  }
  const role = String(roleId || "34");
  const body = {
    data: {
      attributes: {
        resource_id: resourceId,
        shared_type: "personal",
        email_id: String(email).trim().toLowerCase(),
        role_id: role,
        send_notification_mail: false,
      },
      type: "permissions",
    },
  };
  const res = await fetch(`${apiRoot()}/workdrive/api/v1/permissions`, {
    method: "POST",
    headers: {
      ...workdriveHeaders(accessToken),
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("Permission response text:", text);
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const e = new Error(
      json?.message || json?.errors?.[0]?.title || `permission_create_http_${res.status}`,
    );
    e.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    e.details = json;
    throw e;
  }
  const row = dataArray(json)[0] || json?.data;
  const id = row?.id || row?.attributes?.id || null;
  if (!id) {
    const e = new Error("permission_id_missing");
    e.statusCode = 502;
    e.details = json;
    throw e;
  }
  return { id: String(id) };
}

/**
 * Delete a WorkDrive permission by id.
 */
export async function deleteWorkdrivePermission(accessToken, permissionId) {
  if (!permissionId) return { ok: true, skipped: true };
  const res = await fetch(
    `${apiRoot()}/workdrive/api/v1/permissions/${encodeURIComponent(permissionId)}`,
    {
      method: "DELETE",
      headers: workdriveHeaders(accessToken),
    },
  );
  if (res.ok || res.status === 404) return { ok: true };
  const text = await res.text().catch(() => "");
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  const e = new Error(
    json?.message || json?.errors?.[0]?.title || `permission_delete_http_${res.status}`,
  );
  e.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
  e.details = json;
  throw e;
}

/**
 * Create a folder under parentId (personal or team workspace).
 * @returns {Promise<{ id: string, name: string, kind: string }>}
 */
export async function createWorkdriveFolder(accessToken, { parentId, name }) {
  if (!parentId || !name) {
    const e = new Error("parent_id_and_name_required");
    e.statusCode = 400;
    throw e;
  }

  const bodies = [
    {
      path: "/workdrive/api/v1/files",
      body: {
        data: {
          attributes: {
            name,
            parent_id: parentId,
          },
          type: "files",
        },
      },
    },
    {
      path: `/workdrive/api/v1/files/${encodeURIComponent(parentId)}/files`,
      body: {
        data: {
          attributes: { name, type: "folder" },
          type: "files",
        },
      },
    },
  ];

  let lastErr = null;
  for (const attempt of bodies) {
    try {
      const res = await fetch(`${apiRoot()}${attempt.path}`, {
        method: "POST",
        headers: {
          ...workdriveHeaders(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attempt.body),
      });
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok) {
        lastErr = new Error(
          json?.message || json?.errors?.[0]?.title || `create_folder_http_${res.status}`,
        );
        lastErr.statusCode = res.status;
        lastErr.details = json;
        continue;
      }
      const row = dataArray(json)[0] || json?.data;
      const mapped = mapWorkdriveResource(row);
      if (mapped?.id) return mapped;
      if (row?.id) {
        return { id: row.id, name, kind: "folder" };
      }
    } catch (err) {
      lastErr = err;
    }
  }

  const e = lastErr || new Error("workdrive_create_folder_failed");
  e.statusCode = e.statusCode || 502;
  throw e;
}

/**
 * Find a child folder by exact name under parent.
 */
export async function findChildFolderByName(accessToken, parentId, name, { team = false } = {}) {
  const listed = team
    ? await listTeamFolderItems(accessToken, parentId)
    : await listFolderItems(accessToken, parentId);
  const needle = String(name).trim().toLowerCase();
  return (
    listed.items.find(
      (i) => i.kind === "folder" && String(i.name).trim().toLowerCase() === needle,
    ) || null
  );
}
