"use client";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocMetadataPanel from "./DocMetadataPanel";
import DocWorkflowBanner from "./DocWorkflowBanner";
import DocSharePanel from "./DocSharePanel";
import DocRevokePanel from "./DocRevokePanel";
import { versionLabel } from "./DocDocumentGrid";
import SharedFolderBrowser from "./SharedFolderBrowser";

export default function DocDetail({ documentId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMode = searchParams.get("register") === "1";
  const metadataRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}`));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
    apiFetch(docPath("/org/users"))
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [load]);

  const ACTION_SUCCESS = {
    submit: "Submitted for review",
    resubmit: "Resubmitted for review",
    approve: "Approved — moved to the next stage",
    request_changes: "Sent back to the author with review points",
    archive: "Document archived",
    revoke: "Document revoked for revision",
  };

  async function openHistorySnapshot(label) {
    if (!label) return;
    setSnapshotLoading(true);
    setSnapshotOpen(true);
    try {
      const res = await apiFetch(
        docPath(`/documents/${documentId}/history/${encodeURIComponent(label)}`),
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      setSnapshot(json.snapshot);
    } catch (e) {
      message.error(String(e.message || e));
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function transition(action, extra = {}) {
    setActionLoading(true);
    try {
      let metadataSaved = false;
      if (action === "submit" || action === "resubmit") {
        const flush = await metadataRef.current?.flushSave?.();
        if (flush && flush.ok === false) {
          return;
        }
        metadataSaved = Boolean(flush?.saved);
      }
      const res = await apiFetch(docPath(`/documents/${documentId}/transition`), {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      if (metadataSaved && (action === "submit" || action === "resubmit")) {
        message.success(
          action === "resubmit"
            ? "Metadata saved, then resubmitted for review"
            : "Metadata saved, then submitted for review",
        );
      } else {
        message.success(ACTION_SUCCESS[action] || "Updated");
      }
      await load();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setActionLoading(false);
    }
  }

  async function promote(values) {
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/promote`), {
        method: "POST",
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      message.success("Registered — managed copy created; dump file kept");
      const managedId = json.document?.id;
      if (managedId && managedId !== documentId) {
        router.replace(`/m/docq/documents/${managedId}`);
      } else {
        load();
        if (registerMode) router.replace(`/m/docq/documents/${documentId}`);
      }
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  if (loading && !data) return <Card loading />;
  if (!data?.document) return <Card>Document not found</Card>;

  const doc = data.document;
  const pendingTask = data.currentUserPendingTask;
  const taskRole = pendingTask?.role;

  const shareCount = (data.shares || []).length;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {doc.title || "Untitled document"}
        </Typography.Title>
        <Space>
          {doc.workdrive_permalink ? (
            <Button href={doc.workdrive_permalink} target="_blank" rel="noreferrer">
              Open in WorkDrive
            </Button>
          ) : null}
          <Button type="primary" onClick={() => setShareOpen(true)}>
            Share{shareCount ? ` (${shareCount})` : ""}
          </Button>
        </Space>
      </div>

      <DocWorkflowBanner
        doc={doc}
        data={data}
        users={users}
        loading={actionLoading}
        onTransition={transition}
        onRevoke={() => setRevokeOpen(true)}
      />

      {doc.state === "under_revision" ? (
        <Alert
          type="warning"
          showIcon
          message="Under revision"
          description={
            <>
              {doc.revision_of_label ? (
                <div>
                  Revising from approved <strong>Ver {doc.revision_of_label}</strong>
                  {doc.version_label ? <> → current <strong>Ver {doc.version_label}</strong></> : null}.
                </div>
              ) : null}
              {doc.revoke_reason ? <div>Reason: {doc.revoke_reason}</div> : null}
              {doc.under_revision_since ? (
                <div>Since: {new Date(doc.under_revision_since).toLocaleString()}</div>
              ) : null}
            </>
          }
        />
      ) : null}

      <DocMetadataPanel
        ref={metadataRef}
        documentId={documentId}
        data={data}
        onUpdated={load}
      />

      <Card title="Workflow">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="State">
            <Tag>{doc.state}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Workflow stage">
            {doc.workflow_stage ? <Tag color="blue">{doc.workflow_stage}</Tag> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Zone">{doc.zone}</Descriptions.Item>
          <Descriptions.Item label="Review round">{doc.review_round ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Version">
            {doc.version_label ? `Ver ${doc.version_label}` : doc.version}
          </Descriptions.Item>
          <Descriptions.Item label="Current assignee">
            {doc.current_approver_email || "—"}
          </Descriptions.Item>
        </Descriptions>

        {doc.zone === "scratch" ? (
          <Card
            type="inner"
            title={registerMode ? "Register document" : "Register into managed library"}
            style={{ marginTop: 16 }}
          >
            <Typography.Paragraph type="secondary">
              {doc.dump_registered ? (
                <>
                  Already registered
                  {doc.registered_managed_id ? (
                    <>
                      {" "}
                      —{" "}
                      <Link href={`/m/docq/documents/${doc.registered_managed_id}`}>
                        open managed copy
                      </Link>
                    </>
                  ) : null}
                  . The dump file stays in your personal folder.
                </>
              ) : (
                <>
                  Copies this dump file into managed documents. The original stays in your dump
                  folder and is marked Registered.
                </>
              )}
            </Typography.Paragraph>
            {!doc.dump_registered ? (
              <Form layout="inline" onFinish={promote}>
                <Form.Item name="docType" initialValue={doc.doc_type || "general"} rules={[{ required: true }]}>
                  <Select
                    style={{ width: 160 }}
                    options={["general", "manual", "contract", "design", "cad", "spec", "policy"].map(
                      (v) => ({ value: v, label: v }),
                    )}
                  />
                </Form.Item>
                <Form.Item name="title" initialValue={doc.title} rules={[{ required: true, message: "Title is required" }]}>
                  <Input placeholder="Document name" style={{ width: 240 }} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  Copy &amp; register
                </Button>
              </Form>
            ) : null}
          </Card>
        ) : null}
      </Card>
      
      {doc.doc_type === "folder" ? (
        <SharedFolderBrowser shareId={doc.id} folderName={doc.title}/>
      ) : (
      <Card>
        <Tabs
          items={[
            {
              key: "workflow-tasks",
              label: "Workflow tasks",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.workflowTasks || []}
                  columns={[
                    { title: "Stage", dataIndex: "stage_id" },
                    { title: "Role", dataIndex: "role" },
                    { title: "Assignee", dataIndex: "assignee_email" },
                    { title: "Status", dataIndex: "status" },
                    { title: "Decision", dataIndex: "decision" },
                    { title: "Due", dataIndex: "due_at" },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              label: "Metadata history",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.metadataHistory || []}
                  columns={[
                    { title: "Field", dataIndex: "field_name" },
                    { title: "Old", dataIndex: "old_value" },
                    { title: "New", dataIndex: "new_value" },
                    { title: "By", dataIndex: "changed_by_email" },
                    { title: "At", dataIndex: "created_at" },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: "review-points",
              label: "Review points",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.reviewPoints || []}
                  columns={[
                    { title: "Round", dataIndex: "round" },
                    { title: "Stage", dataIndex: "stage_id" },
                    { title: "Point", dataIndex: "body" },
                    { title: "Status", dataIndex: "status" },
                    { title: "By", dataIndex: "created_by_email" },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: "history",
              label: "Workflow history",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.history || []}
                  columns={[
                    { title: "Action", dataIndex: "action" },
                    { title: "From", dataIndex: "from_state" },
                    { title: "To", dataIndex: "to_state" },
                    { title: "By", dataIndex: "actor_email" },
                    { title: "Comment", dataIndex: "comment" },
                    { title: "At", dataIndex: "created_at" },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: "comments",
              label: "Review comments",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.reviewComments || []}
                  columns={[
                    { title: "Author", dataIndex: "author_email" },
                    { title: "Comment", dataIndex: "body" },
                    { title: "At", dataIndex: "created_at" },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: "versions",
              label: "Versions",
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.versions || []}
                  columns={[
                    {
                      title: "Version",
                      key: "version",
                      render: (_, row) => versionLabel(row),
                    },
                    {
                      title: "Historical",
                      dataIndex: "is_historical",
                      width: 100,
                      render: (v) => (v ? <Tag>archived</Tag> : "—"),
                    },
                    { title: "By", dataIndex: "uploaded_by_email" },
                    { title: "Summary", dataIndex: "change_summary" },
                    { title: "At", dataIndex: "created_at" },
                    {
                      title: "Open",
                      key: "open",
                      width: 90,
                      render: (_, row) =>
                        row.workdrive_permalink ? (
                          <a href={row.workdrive_permalink} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          "—"
                        ),
                    },
                    {
                      title: "History",
                      key: "history",
                      width: 100,
                      render: (_, row) =>
                        row.is_historical ||
                        (data.historySnapshots || []).some(
                          (s) => s.version_label === row.version_label,
                        ) ? (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => openHistorySnapshot(row.version_label)}
                          >
                            Snapshot
                          </Button>
                        ) : (
                          "—"
                        ),
                    },
                  ]}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>
      )}

      <Button onClick={() => router.push("/m/docq/my-documents")}>Back to library</Button>

      <DocSharePanel
        documentId={documentId}
        documentTitle={doc.title}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onChanged={load}
      />

      <DocRevokePanel
        open={revokeOpen}
        documentId={documentId}
        documentTitle={doc.title}
        currentAuthor={doc.author_email}
        versionLabel={doc.version_label}
        users={users}
        onClose={() => setRevokeOpen(false)}
        onRevoked={() => {
          setRevokeOpen(false);
          load();
        }}
      />

      <Drawer
        title={snapshot ? `History snapshot — Ver ${snapshot.version_label}` : "History snapshot"}
        open={snapshotOpen}
        onClose={() => {
          setSnapshotOpen(false);
          setSnapshot(null);
        }}
        width={560}
      >
        {snapshotLoading ? (
          <Card loading />
        ) : snapshot ? (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Version">{snapshot.version_label}</Descriptions.Item>
              <Descriptions.Item label="State at snapshot">
                {snapshot.state_at_snapshot}
              </Descriptions.Item>
              <Descriptions.Item label="Stamped by">{snapshot.stamped_by_email}</Descriptions.Item>
              <Descriptions.Item label="Stamped at">
                {snapshot.stamped_at ? new Date(snapshot.stamped_at).toLocaleString() : "—"}
              </Descriptions.Item>
              {snapshot.workdrive_permalink ? (
                <Descriptions.Item label="File">
                  <a href={snapshot.workdrive_permalink} target="_blank" rel="noreferrer">
                    Open in WorkDrive
                  </a>
                </Descriptions.Item>
              ) : null}
            </Descriptions>
            <Card type="inner" title="Metadata at snapshot" size="small">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
                {JSON.stringify(snapshot.metadata || {}, null, 2)}
              </pre>
            </Card>
            <Card type="inner" title="Review / workflow bundle" size="small">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 360, overflow: "auto" }}>
                {JSON.stringify(snapshot.bundle || {}, null, 2)}
              </pre>
            </Card>
          </Space>
        ) : (
          <Typography.Paragraph type="secondary">No snapshot found for this version.</Typography.Paragraph>
        )}
      </Drawer>
    </Space>
  );
}
