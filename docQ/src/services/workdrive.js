import { env } from "../config.js";

function apiRoot() {
  return env.workdriveApiBase.replace(/\/$/, "");
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

export async function fetchWorkdriveMe(accessToken) {
  const json = await workdriveGet(accessToken, "/workdrive/api/v1/users/me");
  const row = dataArray(json)[0] || json?.data;
  const attrs = row?.attributes || {};
  return {
    userId: row?.id || null,
    zuid: attrs.zuid || attrs.ZUID || attrs.zoho_user_id || row?.id || null,
    email: attrs.email_id || attrs.email || null,
    displayName: attrs.display_name || attrs.name || null,
    myFolderId: attrs.myfolder_id || attrs.my_folder_id || null,
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

export async function listFolderItems(accessToken, folderId) {
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
