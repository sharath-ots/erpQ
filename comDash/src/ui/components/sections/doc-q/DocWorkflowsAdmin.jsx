"use client";

import { Button, Card, Form, Input, Select, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apigate";

function safeJsonParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

const DEFAULT_DOC_TYPES = ["design", "policy", "manual"];

export default function DocWorkflowsAdmin() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [docType, setDocType] = useState(DEFAULT_DOC_TYPES[0]);
  const [jsonText, setJsonText] = useState(
    JSON.stringify(
      {
        states: ["draft", "in_review", "approved"],
        transitions: [
          { action: "submit", from: "draft", to: "in_review", groups: ["authors"] },
          { action: "approve", from: "in_review", to: "approved", groups: ["approvers"] },
          { action: "request_changes", from: "in_review", to: "draft", groups: ["approvers"] },
        ],
      },
      null,
      2,
    ),
  );

  const existing = useMemo(
    () => workflows.find((w) => w.doc_type === docType),
    [workflows, docType],
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const res = await apiFetch(
          "/api/v1/partners/workdrive/api/v1/docs/workflows",
        );
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
        }
        const json = await res.json();
        if (!alive) return;
        setWorkflows(json.workflows || []);
      } catch (e) {
        if (alive) setStatus(String(e?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (existing?.definition) {
      setJsonText(JSON.stringify(existing.definition, null, 2));
    }
  }, [existing?.definition]);

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const parsed = safeJsonParse(jsonText);
      if (!parsed.ok) throw new Error(`Invalid JSON: ${parsed.error}`);

      const res = await apiFetch(
        `/api/v1/partners/workdrive/api/v1/docs/workflows/${encodeURIComponent(docType)}`,
        {
          method: "PUT",
          body: JSON.stringify({ definition: parsed.value }),
        },
      );
      const t = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      setStatus("Saved.");
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Workflow Admin"
      loading={loading}
      extra={
        status ? (
          <Typography.Text type={status === "Saved." ? "success" : "danger"}>
            {status}
          </Typography.Text>
        ) : null
      }
    >
      <Typography.Paragraph type="secondary">
        Define per-document-type workflow JSON. V1 requires a JWT with admin claim
        (<Typography.Text code>allowedDocTypes</Typography.Text> contains <Typography.Text code>*</Typography.Text>).
      </Typography.Paragraph>

      <Form layout="vertical">
        <Form.Item label="Document type">
          <Select
            value={docType}
            onChange={(v) => setDocType(v)}
            options={DEFAULT_DOC_TYPES.map((d) => ({ value: d, label: d }))}
          />
        </Form.Item>

        <Form.Item label="Definition JSON">
          <Input.TextArea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            autoSize={{ minRows: 14, maxRows: 28 }}
            spellCheck={false}
          />
        </Form.Item>

        <Button type="primary" onClick={save} loading={saving}>
          Save
        </Button>
      </Form>
    </Card>
  );
}

