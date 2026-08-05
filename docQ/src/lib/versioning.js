/**
 * Decimal versioning helpers for docQ.
 * Drafts: 0.1, 0.2, ...  On approval: N.0.  On revoke of N.0: N.1 under revision.
 */

export function versionLabel(major, minor) {
  return `${Number(major) || 0}.${Number(minor) || 0}`;
}

export function parseVersion(docOrRow) {
  const major = Number(docOrRow?.version_major);
  const minor = Number(docOrRow?.version_minor);
  if (Number.isFinite(major) && Number.isFinite(minor)) {
    return { major, minor, label: versionLabel(major, minor) };
  }
  const raw = String(docOrRow?.version_label || "").trim();
  const m = raw.match(/^(\d+)\.(\d+)$/);
  if (m) {
    return {
      major: Number(m[1]),
      minor: Number(m[2]),
      label: versionLabel(m[1], m[2]),
    };
  }
  return { major: 0, minor: 1, label: "0.1" };
}

/** Initial draft for a newly created managed document. */
export function initialDraftVersion() {
  return { major: 0, minor: 1, label: "0.1", version: 1 };
}

/** Bump minor while editing (draft / changes_requested / under_revision). */
export function draftBump(docOrRow) {
  const { major, minor } = parseVersion(docOrRow);
  const nextMinor = minor + 1;
  return {
    major,
    minor: nextMinor,
    label: versionLabel(major, nextMinor),
    version: major * 10 + nextMinor,
  };
}

/**
 * On final approval: major += 1, minor = 0.
 * 0.6 -> 1.0; 1.2 -> 2.0
 */
export function approveBump(docOrRow) {
  const { major } = parseVersion(docOrRow);
  const nextMajor = major + 1;
  return {
    major: nextMajor,
    minor: 0,
    label: versionLabel(nextMajor, 0),
    version: nextMajor * 10,
  };
}

/**
 * On revoke of an approved M.0 (or M.N): become M.1 under revision.
 * If already at M.0, next is M.1. If somehow at M.N with N>0, still bump to M.(N+1).
 */
export function revokeBump(docOrRow) {
  const { major, minor } = parseVersion(docOrRow);
  const nextMinor = minor === 0 ? 1 : minor + 1;
  return {
    major,
    minor: nextMinor,
    label: versionLabel(major, nextMinor),
    version: major * 10 + nextMinor,
  };
}
