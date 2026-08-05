"use client";

import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Statistic,
  Table,
  Typography,
  Upload,
  message,
} from "antd";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getAccessToken, parseCityQJwtPayload } from "@/lib/apigate";
import { docPath } from "./docQApi";

const BROWSE_URL = docPath("/workdrive/browse");
const SUMMARY_URL = docPath("/dashboard/summary");
const LINK_STATUS_URL = docPath("/workdrive/link-status");
const SCRATCH_UPLOAD_URL = docPath("/scratch/upload");

function formatBytes(n) {
  const size = Number(n);
  if (!Number.isFinite(size) || size <= 0) return "â€”";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function browseQuery({ folderId, source, area }) {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  if (source) params.set("source", source);
  if (area) params.set("area", area);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function DocDashboard() {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");

  const [area, setArea] = useState("shared");
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browse, setBrowse] = useState(null);
  const [browseError, setBrowseError] = useState("");
  const [trail, setTrail] = useState([]);
  const [linkStatus, setLinkStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sessionEmail =
    parseCityQJwtPayload(getAccessToken())?.email || "";

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(LINK_STATUS_URL);
        const json = await res.json().catch(() => ({}));
        if (alive) setLinkStatus(json);
      } catch {
        if (alive) setLinkStatus(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadBrowse = useCallback(
    async ({ folderId = "", source = "", trail: nextTrail = [], area: nextArea = area }) => {
      setBrowseLoading(true);
      setBrowseError("");
      try {
        const res = await apiFetch(
          `${BROWSE_URL}${browseQuery({ folderId, source, area: nextArea })}`,
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = json?.message || json?.error || `HTTP ${res.status}`;
          if (res.status === 412 || json?.error === "workdrive_not_linked") {
            throw new Error(
              `WorkDrive is not linked for ${sessionEmail || "this account"}. Sign out â†’ revoke this app in Zoho Account â†’ Security â†’ Connected Apps â†’ Sign in with Zoho again (accept WorkDrive scopes so a refresh token is issued).`,
            );
          }
          if (res.status === 503 || json?.error === "docq_unreachable") {
            throw new Error(
              "Document service (docq) is not running. Rebuild/restart docq on the LAN VM.",
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
    },
    [area, sessionEmail],
  );

  useEffect(() => {
    loadBrowse({ folderId: "", source: "", trail: [], area });
  }, [loadBrowse, area]);

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
        source: row.source || (area === "shared" ? "teamfolder" : "my"),
        trail: [
          {
            id: row.id,
            name: row.name,
            source: row.source || (area === "shared" ? "teamfolder" : "my"),
          },
        ],
        area,
      });
      return;
    }

    loadBrowse({
      folderId: row.id,
      source: row.source || browse?.source || "my",
      trail: nextTrail,
      area,
    });
  };

  const goUp = () => {
    if (browse?.view === "roots") return;
    const prev = trail.slice(0, -1);
    if (!prev.length) {
      loadBrowse({ folderId: "", source: "", trail: [], area });
      return;
    }
    const parent = prev[prev.length - 1];
    loadBrowse({
      folderId: parent.id,
      source: parent.source || browse?.source || "",
      trail: prev.slice(0, -1),
      area,
    });
  };

  const goRoot = () => loadBrowse({ folderId: "", source: "", trail: [], area });

  async function onUpload(file) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(SCRATCH_UPLOAD_URL, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 412 || json?.error === "workdrive_not_linked") {
          throw new Error(
            "WorkDrive not linked â€” sign in with Zoho again after revoking the app so a refresh token is stored.",
          );
        }
        throw new Error(json.error || json.message || res.statusText);
      }
      message.success("Uploaded to personal scratch (My Folders)");
      if (area === "personal") {
        loadBrowse({ folderId: "", source: "", trail: [], area });
      }
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setUploading(false);
    }
    return false;
  }

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
      width: 140,
      render: (_, row) => {
        if (row.role === "managed") return "Managed library";
        if (row.role === "dump") return "Shared dump";
        if (row.type === "teamfolder" || row.source === "teamfolder") return "Team folder";
        if (row.area === "personal" || row.source === "my") return "Personal";
        if (row.kind === "folder") return "Folder";
        return "File";
      },
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 110,
      render: (v, row) => (row.kind === "file" ? formatBytes(v) : "â€”"),
    },
    {
      title: "Modified",
      dataIndex: "modifiedTime",
      key: "modifiedTime",
      width: 180,
      render: (v) => v || "â€”",
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
  const linked = linkStatus?.linked === true;

  return (
    <>
      <Card title="Documents" loading={summaryLoading}>
        {summaryError ? (
          <Typography.Text type="danger">{summaryError}</Typography.Text>
        ) : null}
                <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Link href="/m/docq/for-review">
              <Card hoverable>
                <Statistic title="For review" value={summary?.pendingReview ?? 0} />
              </Card>
            </Link>
          </Col>
          <Col xs={12} md={6}>
            <Link href="/m/docq/my-documents">
              <Card hoverable>
                <Statistic title="My drafts" value={summary?.myDrafts ?? 0} />
              </Card>
            </Link>
          </Col>
          <Col xs={12} md={6}>
            <Link href="/m/docq/scratch">
              <Card hoverable>
                <Statistic title="Rough dump" value={summary?.scratchCount ?? 0} />
              </Card>
            </Link>
          </Col>
          <Col xs={12} md={6}>
            <Link href="/m/docq/changes-requested">
              <Card hoverable>
                <Statistic title="Changes to fix" value={summary?.changesRequested ?? 0} />
              </Card>
            </Link>
          </Col>
          <Col xs={12} md={6}>
            <Link href="/m/docq/for-approval">
              <Card hoverable>
                <Statistic title="For approval" value={summary?.pendingApproval ?? 0} />
              </Card>
            </Link>
          </Col>
          <Col xs={12} md={6}>
            <Link href="/m/docq/my-documents">
              <Card hoverable>
                <Statistic title="Waiting on others" value={summary?.myWaiting ?? 0} />
              </Card>
            </Link>
          </Col>
        </Row>
      </Card>

      <Card
        title="WorkDrive"
        style={{ marginTop: 16 }}
        extra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Segmented
              value={area}
              onChange={(v) => {
                setArea(v);
                setTrail([]);
              }}
              options={[
                { label: "Shared org", value: "shared" },
                { label: "Personal drafts", value: "personal" },
              ]}
            />
            {showUp ? <Button onClick={goUp}>Up</Button> : null}
            <Upload beforeUpload={onUpload} showUploadList={false} maxCount={1}>
              <Button type="primary" loading={uploading} disabled={!linked && linkStatus}>
                Upload
              </Button>
            </Upload>
          </div>
        }
      >
        {sessionEmail ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Signed in as <Typography.Text code>{sessionEmail}</Typography.Text>
            {linked === true ? " Â· WorkDrive linked" : null}
            {linkStatus && linked === false ? " Â· WorkDrive not linked" : null}
          </Typography.Paragraph>
        ) : null}

        {linkStatus && linked === false ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="WorkDrive not linked for this login"
            description={
              <>
                Keys in .env.lan alone are not enough â€” Zoho must issue a <b>refresh token</b> on
                consent and authQ must store it in docQ for <b>this exact email</b>.
                <ol style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>
                    Zoho Account â†’ Security â†’ Connected Apps â†’ revoke this portal app
                  </li>
                  <li>Sign out of the portal, then use Sign in with Zoho again</li>
                  <li>Accept all WorkDrive scopes on the consent screen</li>
                </ol>
              </>
            }
          />
        ) : null}

        {browse?.view === "roots" && !browseError ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            {area === "shared"
              ? "Shared org library (Managed Org Folder + Shared Dump). Zoho Team Folder permissions apply."
              : "Personal My Folders â€” drafts and rough work. Upload stores into scratch / My Folders."}
          </Typography.Paragraph>
        ) : null}

        {browse?.warnings?.length ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="WorkDrive warnings"
            description={browse.warnings.map((w) => (
              <div key={`${w.step}-${w.message}`}>
                {w.step}: {w.message}
              </div>
            ))}
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
              ? "Loadingâ€¦"
              : browse?.view === "roots"
                ? "No WorkDrive locations found."
                : "No files or folders in this location.",
          }}
        />
      </Card>
    </>
  );
}
