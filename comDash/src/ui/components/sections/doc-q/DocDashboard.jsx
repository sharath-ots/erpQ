"use client";

import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Typography,
} from "antd";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";

const BROWSE_URL = "/api/v1/partners/workdrive/api/v1/docs/workdrive/browse";
const SUMMARY_URL =
  "/api/v1/partners/workdrive/api/v1/docs/dashboard/summary";

const NOT_LINKED_MSG =
  "WorkDrive is not linked for this account. Ask your admin to set CITYQ_SERVICE_KEY and DOCQ_TOKEN_ENC_KEY_B64 in .env.lan, restart auth and docq, then sign out and sign in with Zoho again (Zoho must show a refresh token on first consent).";

function formatBytes(n) {
  const size = Number(n);
  if (!Number.isFinite(size) || size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function browseQuery({ folderId, source }) {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  if (source) params.set("source", source);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function DocDashboard() {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");

  const [browseLoading, setBrowseLoading] = useState(true);
  const [browse, setBrowse] = useState(null);
  const [browseError, setBrowseError] = useState("");
  const [trail, setTrail] = useState([]);

  useEffect(() => {
    let alive = true;
    async function run() {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const res = await apiFetch(SUMMARY_URL);
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
        }
        const json = await res.json();
        if (alive) setSummary(json);
      } catch (e) {
        if (alive) setSummaryError(String(e?.message ?? e));
      } finally {
        if (alive) setSummaryLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  const loadBrowse = useCallback(async ({ folderId = "", source = "", trail: nextTrail = [] }) => {
    setBrowseLoading(true);
    setBrowseError("");
    try {
      const res = await apiFetch(`${BROWSE_URL}${browseQuery({ folderId, source })}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        if (res.status === 412 || json?.error === "workdrive_not_linked") {
          throw new Error(NOT_LINKED_MSG);
        }
        if (res.status === 503 || json?.error === "docq_unreachable") {
          throw new Error(
            "Document service (docq) is not running. On the VM run: lan-deploy.ps1 -Services cityq-db,docq,apigate",
          );
        }
        throw new Error(String(msg));
      }
      setBrowse(json);
      setTrail(nextTrail);
    } catch (e) {
      setBrowse(null);
      setBrowseError(String(e?.message ?? e));
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrowse({ folderId: "", source: "", trail: [] });
  }, [loadBrowse]);

  const openFolder = (row) => {
    const nextTrail = [
      ...trail,
      {
        id: browse?.folderId || "",
        name: browse?.folderName || "WorkDrive",
        source: browse?.source || "",
      },
    ].filter((t) => t.id || browse?.view === "roots");

    if (browse?.view === "roots") {
      loadBrowse({
        folderId: row.id,
        source: row.source || "my",
        trail: [{ id: row.id, name: row.name, source: row.source || "my" }],
      });
      return;
    }

    loadBrowse({
      folderId: row.id,
      source: row.source || browse?.source || "my",
      trail: nextTrail,
    });
  };

  const goUp = () => {
    if (browse?.view === "roots") return;
    const prev = trail.slice(0, -1);
    if (!prev.length) {
      loadBrowse({ folderId: "", source: "", trail: [] });
      return;
    }
    const parent = prev[prev.length - 1];
    loadBrowse({
      folderId: parent.id,
      source: parent.source || browse?.source || "",
      trail: prev.slice(0, -1),
    });
  };

  const goRoot = () => loadBrowse({ folderId: "", source: "", trail: [] });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, row) => (
        <Typography.Text>
          {row.kind === "folder" ? (
            <FolderOutlined style={{ marginRight: 8 }} />
          ) : (
            <FileOutlined style={{ marginRight: 8 }} />
          )}
          {row.kind === "folder" ? (
            <Button type="link" style={{ padding: 0 }} onClick={() => openFolder(row)}>
              {name}
            </Button>
          ) : (
            name
          )}
        </Typography.Text>
      ),
    },
    {
      title: "Type",
      key: "kind",
      width: 120,
      render: (_, row) => {
        if (row.type === "teamfolder" || row.source === "teamfolder") return "Team folder";
        if (row.kind === "folder") return "Folder";
        return "File";
      },
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 110,
      render: (v, row) => (row.kind === "file" ? formatBytes(v) : "—"),
    },
    {
      title: "Modified",
      dataIndex: "modifiedTime",
      key: "modifiedTime",
      width: 180,
      render: (v) => v || "—",
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, row) =>
        row.permalink ? (
          <a href={row.permalink} target="_blank" rel="noreferrer">
            Open
          </a>
        ) : null,
    },
  ];

  const breadcrumbItems = [
    {
      title: (
        <Button type="link" style={{ padding: 0 }} onClick={goRoot}>
          WorkDrive
        </Button>
      ),
    },
    ...trail.map((t) => ({ title: t.name })),
    ...(browse?.view === "folder" && browse.folderName
      ? [{ title: browse.folderName }]
      : []),
  ];

  const showUp = browse?.view === "folder";

  return (
    <>
      <Card title="Documents" loading={summaryLoading}>
        {summaryError ? (
          <Typography.Text type="danger">{summaryError}</Typography.Text>
        ) : null}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="My drafts" value={summary?.myDrafts ?? 0} />
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Registered in docQ (by state)">
              {(summary?.byState || []).map((r) => (
                <Typography.Paragraph key={r.state} style={{ marginBottom: 8 }}>
                  <Typography.Text strong>{r.state}</Typography.Text>: {r.count}
                </Typography.Paragraph>
              ))}
              {!summary?.byState?.length && (
                <Typography.Text type="secondary">
                  No documents registered yet.
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title="My WorkDrive"
        style={{ marginTop: 16 }}
        extra={showUp ? <Button onClick={goUp}>Up</Button> : null}
      >
        {browse?.view === "roots" && !browseError ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            Files live inside folders. Click <Typography.Text strong>My Folders</Typography.Text> or
            your team folder (e.g. skillworks) to browse uploads.
          </Typography.Paragraph>
        ) : null}
        {browse?.warnings?.length && !browse?.items?.length ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="WorkDrive locations could not be loaded"
            description={
              <>
                {browse.warnings.map((w) => (
                  <div key={`${w.step}-${w.message}`}>
                    {w.step}: {w.message}
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  If this persists, sign out, revoke the app under Zoho Account → Security →
                  Connected apps, then sign in with Zoho again.
                </div>
              </>
            }
          />
        ) : null}
        {browseError ? (
          <Typography.Paragraph type="danger">{browseError}</Typography.Paragraph>
        ) : null}
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 12 }} />
        <Table
          rowKey="id"
          loading={browseLoading}
          columns={columns}
          dataSource={browse?.items || []}
          pagination={false}
          locale={{
            emptyText: browseLoading
              ? "Loading…"
              : browse?.view === "roots"
                ? "No WorkDrive locations found."
                : "No files or folders in this location.",
          }}
        />
      </Card>
    </>
  );
}
