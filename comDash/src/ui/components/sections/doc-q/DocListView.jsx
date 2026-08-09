"use client";

import { Card, Input, Modal, Select, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocDocumentGrid from "./DocDocumentGrid";
import DocRevokePanel from "./DocRevokePanel";

export default function DocListView({
  title,
  embedded = false,
  description,
  view,
  zone = "managed",
  showActions = false,
  authorActions = false,
  emptyHint,
}) {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [docType, setDocType] = useState("");
  const [actionDoc, setActionDoc] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revokeDoc, setRevokeDoc] = useState(null);
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (view) params.set("view", view);
      if (!view && zone) params.set("zone", zone);
      if (docType) params.set("docType", docType);
      if (q) params.set("q", q);
      
      const res = await apiFetch(`${docPath("/documents")}?${params}`);
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(json.detail || json.error || res.statusText);
      setDocs(json.documents || []);
    } catch (e) {
      message.error(String(e.message || e));
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [view, zone, docType, q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view !== "revocable") return;
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [view]);

  async function runTransition(action, doc, extra = {}) {
    setSubmitting(true);
    try {
      const body = { action, comment, ...extra };
      if (action === "request_changes") {
        body.reviewPoints = comment.split(/\n/).map((s) => s.trim()).filter(Boolean);
      }
      const res = await apiFetch(docPath(`/documents/${doc.id}/transition`), {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(json.detail || json.error || res.statusText);
      
      message.success(json.message || (action === "submit" ? "Submitted for review" : "Done"));
      setActionDoc(null);
      setComment("");
      load();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card
        title={embedded ? undefined : title}
        bordered={!embedded}
        style={embedded ? { boxShadow: "none" } : { boxShadow: "none" }}
      >
        {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Input.Search placeholder="Search documents…" allowClear onSearch={setQ} style={{ maxWidth: 280 }} />
          <Select allowClear placeholder="Doc type" style={{ width: 160 }} onChange={(v) => setDocType(v || "")}
            options={["general","manual","contract","design","cad","spec","policy"].map((v) => ({ value: v, label: v }))} />
        </div>
        
        {!loading && !docs.length && emptyHint ? (
          <Typography.Paragraph type="secondary">{emptyHint}</Typography.Paragraph> 
        ) : null}
        
        <DocDocumentGrid
          documents={docs}
          loading={loading}
          showActions={showActions}
          authorActions={authorActions}
          onSubmit={(row) => runTransition("submit", row, {})}
          onResubmit={(row) => runTransition("resubmit", row, {})}
          onApprove={(row) => { setActionDoc(row); setActionType("approve"); setComment(""); }}
          onRequestChanges={(row) => { setActionDoc(row); setActionType("request_changes"); setComment(""); }}
          onRevoke={view === "revocable" ? (row) => setRevokeDoc(row) : undefined}
          onOpen={(row) => router.push(`/m/docq/documents/${row.id}`)}
        />
      </Card>
      
      <Modal open={Boolean(actionDoc)} title={actionType === "approve" ? "Approve" : "Request changes"}
        onCancel={() => setActionDoc(null)} onOk={() => runTransition(actionType, actionDoc)} confirmLoading={submitting}
        okText={actionType === "approve" ? "Approve" : "Send back"}>
        <Typography.Paragraph><strong>{actionDoc?.title}</strong></Typography.Paragraph>
        <Input.TextArea rows={actionType === "request_changes" ? 5 : 3} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder={actionType === "request_changes" ? "One review point per line" : "Optional comment"} />
      </Modal>
      
      <DocRevokePanel
        open={Boolean(revokeDoc)}
        documentId={revokeDoc?.id}
        documentTitle={revokeDoc?.title}
        currentAuthor={revokeDoc?.author_email}
        versionLabel={revokeDoc?.version_label}
        users={users}
        onClose={() => setRevokeDoc(null)}
        onRevoked={() => {
          setRevokeDoc(null);
          load();
        }}
      />
    </>
  );
}