"use client";

import { Button, Space, Table, Tag, Typography } from "antd";
import Link from "next/link";
import { displayStatus, formatDate, nextActionMeta, showApprovedByColumn, showReviewedByColumn } from "./docStatus";

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
    if (!label) return "—";
    return <Link href={`/m/docq/documents/${doc.id}`}>{versionLabel(doc)}</Link>;
  }
  return (
    <Space direction="vertical" size={2}>
      {list.map((v) => (
        <Link key={v.id || v.version_label || v.version} href={`/m/docq/documents/${doc.id}`}>
          {versionLabel(v)}
        </Link>
      ))}
    </Space>
  );
}

export default function DocDocumentGrid({
  documents = [],
  loading = false,
  showReviewedBy = "auto",
  showApprovedBy = "auto",
  showActions = false,
  authorActions = false,
  onApprove,
  onRequestChanges,
  onSubmit,
  onResubmit,
  onRevoke,
  onOpen,
}) {
  const anyReviewed = showReviewedBy === true || (showReviewedBy === "auto" && documents.some(showReviewedByColumn));
  const anyApproved = showApprovedBy === true || (showApprovedBy === "auto" && documents.some(showApprovedByColumn));
  const showYourAction = authorActions || showActions || Boolean(onRevoke);

  const columns = [
    {
      title: "Document name",
      dataIndex: "title",
      key: "title",
      render: (title, row) => (
        <Link href={`/m/docq/documents/${row.id}`}>{title || "Untitled"}</Link>
      ),
    },
    { title: "Doc type", dataIndex: "doc_type", key: "doc_type", width: 100 },
    {
      title: "Versions",
      key: "versions",
      width: 110,
      render: (_, row) => <VersionLinks doc={row} versions={row.versions} />,
    },
    {
      title: "Status",
      key: "status",
      width: 180,
      render: (_, row) => {
        const s = displayStatus(row);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Stage",
      dataIndex: "workflow_stage",
      key: "workflow_stage",
      width: 90,
      render: (v) => v || "—",
    },
    {
      title: "Date created",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: formatDate,
    },
    { title: "Author", dataIndex: "author_email", key: "author_email", ellipsis: true },
  ];

  if (anyReviewed) {
    columns.push({ title: "Reviewed by", dataIndex: "reviewed_by", key: "reviewed_by", ellipsis: true, render: (v) => v || "—" });
  }
  if (anyApproved) {
    columns.push({ title: "Approved by", dataIndex: "approved_by", key: "approved_by", ellipsis: true, render: (v) => v || "—" });
  }

  if (showYourAction) {
    columns.push({
      title: "Your action",
      key: "your_action",
      width: 220,
      render: (_, row) => {
        const meta = nextActionMeta(row.next_action);
        if (row.next_action === "submit") {
          return (
            <Space direction="vertical" size={2}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{meta.label}</Typography.Text>
              <Button size="small" type="primary" onClick={() => onSubmit?.(row)}>{meta.button}</Button>
            </Space>
          );
        }
        if (row.next_action === "resubmit") {
          return (
            <Space direction="vertical" size={2}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{meta.label}</Typography.Text>
              <Button size="small" type="primary" onClick={() => onResubmit?.(row)}>{meta.button}</Button>
            </Space>
          );
        }
        if (row.next_action === "review" || row.next_action === "approve") {
          return (
            <Space wrap>
              <Button size="small" type="primary" onClick={() => onApprove?.(row)}>{meta.button}</Button>
              <Button size="small" onClick={() => onRequestChanges?.(row)}>Send back</Button>
              <Button size="small" type="link" onClick={() => onOpen?.(row)}>Open</Button>
            </Space>
          );
        }
        if (row.next_action === "waiting") {
          return <Typography.Text type="secondary">{meta.label}</Typography.Text>;
        }
        if (onRevoke && (row.can_revoke || row.state === "approved")) {
          return (
            <Space wrap>
              <Button size="small" danger onClick={() => onRevoke?.(row)}>
                Revoke
              </Button>
              <Button size="small" type="link" onClick={() => onOpen?.(row)}>
                Open
              </Button>
            </Space>
          );
        }
        if (showActions && (row.next_action === "review" || row.next_action === "approve")) {
          return null;
        }
        return meta.label !== "—" ? <Typography.Text type="secondary">{meta.label}</Typography.Text> : "—";
      },
    });
  }

  columns.push({
    title: "Links",
    key: "links",
    width: 160,
    fixed: "right",
    render: (_, row) => (
      <Space size="middle" wrap>
        {row.workdrive_permalink ? (
          <a href={row.workdrive_permalink} target="_blank" rel="noreferrer">
            Open
          </a>
        ) : null}
        <Link href={`/m/docq/documents/${row.id}`}>Details</Link>
      </Space>
    ),
  });

  return (
    <Table rowKey="id" loading={loading} dataSource={documents} columns={columns} scroll={{ x: 1200 }} pagination={{ pageSize: 20, showSizeChanger: true }} />
  );
}
