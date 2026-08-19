"use client";

import NextLink from "next/link";
import { Box, Button, Chip, Link, Stack, Typography } from "@mui/material";
import { CommonDataGrid } from "../components/common/CustomTable";

/** Consistent version label from version_label or major.minor. */
export function versionLabel(versionOrRow) {
  if (versionOrRow && typeof versionOrRow === "object") {
    const label =
      versionOrRow.version_label ||
      (versionOrRow.version_major != null && versionOrRow.version_minor != null
        ? `${versionOrRow.version_major}.${versionOrRow.version_minor}`
        : null);
    if (label) return `Ver ${label}`;
    if (versionOrRow.version != null) return `Ver ${versionOrRow.version}`;
    return "—";
  }
  if (versionOrRow == null || versionOrRow === "") return "—";
  const s = String(versionOrRow);
  if (/^\d+\.\d+$/.test(s)) return `Ver ${s}`;
  const n = Number(versionOrRow);
  if (Number.isFinite(n) && !s.includes(".")) return `Ver ${n}.0`;
  return `Ver ${s}`;
}

function VersionLinks({ doc, versions }) {
  const list = Array.isArray(versions) ? versions : [];
  if (!list.length) {
    const label = doc.version_label || doc.version;
    if (!label) return <Typography variant="body2" color="text.secondary">—</Typography>;
    return (
      <Link component={NextLink} href={`/m/docq/documents/${doc.id}`} variant="body2" underline="hover">
        {versionLabel(doc)}
      </Link>
    );
  }
  return (
    <Stack spacing={0.5}>
      {list.map((v) => (
        <Link key={v.id || v.version_label || v.version} component={NextLink} href={`/m/docq/documents/${doc.id}`} variant="body2" underline="hover">
          {versionLabel(v)}
        </Link>
      ))}
    </Stack>
  );
}

function getFolderName(row) {
  if (!row) return "—";
  if (typeof row.folder_name === "string" && row.folder_name) return row.folder_name;
  if (typeof row.folder_path === "string" && row.folder_path) return row.folder_path;
  if (Array.isArray(row.folder_path) && row.folder_path.length) {
    return row.folder_path.map((f) => (typeof f === "object" ? f.name || f.title || f.folder_name : f)).filter(Boolean).join(" / ");
  }
  if (typeof row.folder === "string" && row.folder) return row.folder;
  if (Array.isArray(row.folder)) {
    return row.folder.map((f) => (typeof f === "object" ? f.name || f.title || f.folder_name : f)).filter(Boolean).join(" / ");
  }
  if (row.folder && typeof row.folder === "object") {
    if (row.folder.name) return row.folder.name;
    if (row.folder.title) return row.folder.title;
    if (row.folder.folder_name) return row.folder.folder_name;
    if (row.folder.path) return row.folder.path;
  }
  if (typeof row.folder_title === "string" && row.folder_title) return row.folder_title;
  if (typeof row.parent_folder_name === "string" && row.parent_folder_name) return row.parent_folder_name;
  return "—";
}

export default function DocDocumentGrid({
  documents = [],
  loading = false,
  view,
  showFolder = "auto",
  showReviewedBy = "auto",
  showApprovedBy = "auto",
  showActions = false,
  authorActions = false,
  filterNode, // Controls the left side of the table toolbar
  actionNode, // Controls the right side of the table toolbar
  onApprove,
  onRequestChanges,
  onSubmit,
  onResubmit,
  onRevoke,
  onOpen,
}) {
  const anyReviewed = showReviewedBy === true || (showReviewedBy === "auto" && documents.some(showReviewedByColumn));
  const anyApproved = showApprovedBy === true || (showApprovedBy === "auto" && documents.some(showApprovedByColumn));
  const anyFolder =
    showFolder === true ||
    (showFolder === "auto" && documents.some((d) => getFolderName(d) !== "—")) ||
    view === "shared_with_me" ||
    view === "shared_by_me";

  const showYourAction = authorActions || showActions || Boolean(onRevoke);

  const headCells = [
    {
      id: "title",
      label: "Document Name",
      numeric: false,
      render: (title, row) => (
        <Link component={NextLink} href={`/m/docq/documents/${row.id}`} variant="subtitle2" underline="hover" color="text.primary" fontWeight={600} onClick={(e) => e.stopPropagation()}>
          {title || "Untitled"}
        </Link>
      ),
    },
    { 
      id: "doc_type", 
      label: "Doc Type", 
      numeric: false,
      render: (type) => <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{type}</Typography>
    },
  ];

  if (anyFolder) {
    headCells.push({
      id: "folder",
      label: "Folder",
      numeric: false,
      render: (_, row) => <Typography variant="body2" noWrap>{getFolderName(row)}</Typography>,
    });
  }

  headCells.push(
    {
      id: "versions",
      label: "Versions",
      numeric: false,
      render: (_, row) => <VersionLinks doc={row} versions={row.versions} />,
    },
    {
      id: "status",
      label: "Status",
      numeric: false,
      render: (_, row) => {
        const s = displayStatus(row);
        return <Chip label={s.label} color={s.color} size="small" variant="soft" sx={{ borderRadius: 1 }} />;
      },
    },
    {
      id: "workflow_stage",
      label: "Stage",
      numeric: false,
      render: (v) => <Typography variant="body2">{v || "—"}</Typography>,
    },
    {
      id: "created_at",
      label: "Date Created",
      numeric: false,
      render: (v) => <Typography variant="body2" color="text.secondary">{formatDate(v)}</Typography>,
    },
    { 
      id: "author_email", 
      label: "Author", 
      numeric: false,
      render: (email) => <Typography variant="body2" noWrap>{email}</Typography> 
    }
  );

  if (view === "shared_with_me" || view === "shared_by_me") {
    headCells.push({
      id: "description",
      label: "Share Details",
      numeric: false,
      render: (desc) => <Typography variant="body2" noWrap>{desc || "—"}</Typography>,
    });
  }

  if (anyReviewed) {
    headCells.push({ 
      id: "reviewed_by", 
      label: "Reviewed By", 
      numeric: false, 
      render: (v) => <Typography variant="body2" noWrap>{v || "—"}</Typography> 
    });
  }
  if (anyApproved) {
    headCells.push({ 
      id: "approved_by", 
      label: "Approved By", 
      numeric: false, 
      render: (v) => <Typography variant="body2" noWrap>{v || "—"}</Typography> 
    });
  }

  if (showYourAction) {
    headCells.push({
      id: "your_action",
      label: "Your Action",
      numeric: false,
      render: (_, row) => {
        const meta = nextActionMeta(row.next_action);
        if (row.next_action === "submit") {
          return (
            <Stack spacing={0.5} alignItems="flex-start">
              <Typography variant="caption" color="text.secondary">{meta.label}</Typography>
              <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); onSubmit?.(row); }}>{meta.button}</Button>
            </Stack>
          );
        }
        if (row.next_action === "resubmit") {
          return (
            <Stack spacing={0.5} alignItems="flex-start">
              <Typography variant="caption" color="text.secondary">{meta.label}</Typography>
              <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); onResubmit?.(row); }}>{meta.button}</Button>
            </Stack>
          );
        }
        if (row.next_action === "review" || row.next_action === "approve") {
          return (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); onApprove?.(row); }}>{meta.button}</Button>
              <Button size="small" variant="soft" color="warning" onClick={(e) => { e.stopPropagation(); onRequestChanges?.(row); }}>Send back</Button>
              <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onOpen?.(row); }}>Open</Button>
            </Stack>
          );
        }
        if (row.next_action === "waiting") {
          return <Typography variant="body2" color="text.secondary">{meta.label}</Typography>;
        }
        if (onRevoke && (row.can_revoke || row.state === "approved")) {
          return (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="soft" color="error" onClick={(e) => { e.stopPropagation(); onRevoke?.(row); }}>
                Revoke
              </Button>
              <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onOpen?.(row); }}>
                Open
              </Button>
            </Stack>
          );
        }
        if (showActions && (row.next_action === "review" || row.next_action === "approve")) {
          return null;
        }
        return meta.label !== "—" ? <Typography variant="body2" color="text.secondary">{meta.label}</Typography> : <Typography variant="body2">—</Typography>;
      },
    });
  }

  headCells.push({
    id: "links",
    label: "Links",
    numeric: false,
    render: (_, row) => (
      <Stack direction="row" spacing={2}>
        {row.workdrive_permalink && (
          <Link href={row.workdrive_permalink} target="_blank" rel="noreferrer" variant="body2" underline="hover" onClick={(e) => e.stopPropagation()}>
            Open
          </Link>
        )}
        <Link component={NextLink} href={`/m/docq/documents/${row.id}`} variant="body2" underline="hover" onClick={(e) => e.stopPropagation()}>
          Details
        </Link>
      </Stack>
    ),
  });

  return (
    <CommonDataGrid 
      title={filterNode}  // <-- Replaces empty title to align filters on the left
      actionNode={actionNode} // Keep for any future right-aligned actions
      headCells={headCells} 
      rows={documents} 
      loading={loading}
      defaultPageSize={10} 
    />
  );
}

// ----------------------------------------------------------------------
// Status Formatters mapped to MUI Colors
// ----------------------------------------------------------------------

export function displayStatus(doc) {
  if (!doc) return { label: "—", color: "default" };
  
  // MUI Colors: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
  if (doc.state === "draft") return { label: "Draft — submit for review", color: "warning" };
  if (doc.state === "under_revision") return { label: "Under revision", color: "error" };
  if (doc.state === "changes_requested") return { label: "Sent back — fix & resubmit", color: "warning" };
  if (doc.state === "approved") return { label: "Approved", color: "success" };
  if (doc.state === "archived") return { label: "Archived", color: "default" };
  if (doc.state === "in_review") {
    if (doc.workflow_stage === "approval") return { label: "Reviewed — with approvers", color: "info" };
    if (doc.workflow_stage === "review") return { label: "With reviewers", color: "info" };
    return { label: "In review", color: "info" };
  }
  return { label: String(doc.state || "—"), color: "default" };
}

export function nextActionMeta(action) {
  switch (action) {
    case "submit": return { label: "Submit for review", button: "Submit", color: "primary" };
    case "resubmit": return { label: "Resubmit for review", button: "Resubmit", color: "primary" };
    case "review": return { label: "Complete your review", button: "Review", color: "primary" };
    case "approve": return { label: "Complete your approval", button: "Approve", color: "primary" };
    case "waiting": return { label: "Waiting on others", button: null, color: "default" };
    case "done": return { label: "Approved — no action", button: null, color: "default" };
    default: return { label: "—", button: null, color: "default" };
  }
}

export function showReviewedByColumn(doc) {
  if (!doc) return false;
  if (doc.reviewed_by) return true;
  return (doc.state === "in_review" && doc.workflow_stage === "approval") || doc.state === "approved" || doc.state === "archived";
}

export function showApprovedByColumn(doc) {
  if (!doc) return false;
  if (doc.approved_by) return true;
  return doc.state === "approved" || doc.state === "archived";
}

export function formatDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(value); }
}