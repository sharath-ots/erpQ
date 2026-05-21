"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { apiFetch } from "@/lib/apigate";

export default function DocErpNextLinker() {
  const [form] = Form.useForm();
  const [doc, setDoc] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function lookup(values) {
    setLoading(true);
    setStatus("");
    setDoc(null);
    try {
      const res = await apiFetch(
        `/api/v1/partners/workdrive/api/v1/docs/files/${encodeURIComponent(values.fileId)}`,
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      setDoc(json.document);
      if (json.document?.workdrive_permalink) {
        form.setFieldValue("url", json.document.workdrive_permalink);
      }
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function writeToERPNext() {
    if (!doc?.id) {
      setStatus("Lookup a file first.");
      return;
    }
    const values = form.getFieldsValue();
    const doctype = String(values.erp_doctype || "").trim();
    const docname = String(values.erp_docname || "").trim();
    const fieldname = String(values.fieldname || "").trim() || "workdrive_link";
    const url = String(values.url || "").trim();

    if (!doctype || !docname || !url) {
      setStatus("ERP doctype, ERP docname, and URL are required.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      // 1) Write to ERPNext (optional but requested).
      const r1 = await apiFetch(
        `/api/v1/partners/erpnext/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`,
        {
          method: "PUT",
          body: JSON.stringify({ [fieldname]: url }),
        },
      );
      const t1 = await r1.text();
      if (!r1.ok) throw new Error(`ERPNext update failed HTTP ${r1.status}: ${t1.slice(0, 200)}`);

      // 2) Record reference in docQ for traceability.
      const r2 = await apiFetch(
        `/api/v1/partners/workdrive/api/v1/docs/documents/${encodeURIComponent(doc.id)}/erpnext/ref`,
        {
          method: "POST",
          body: JSON.stringify({
            erp_doctype: doctype,
            erp_docname: docname,
            fieldname,
            url,
          }),
        },
      );
      const t2 = await r2.text();
      if (!r2.ok) throw new Error(`docQ ref save failed HTTP ${r2.status}: ${t2.slice(0, 200)}`);

      setStatus("Linked in ERPNext and recorded in docQ.");
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="ERPNext Reference"
      extra={status ? <Typography.Text>{status}</Typography.Text> : null}
    >
      <Typography.Paragraph type="secondary">
        Lookup a registered WorkDrive file and (optionally) write its WorkDrive URL into an ERPNext
        document field via the existing ERPNext partner API.
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={lookup}
        initialValues={{ fieldname: "workdrive_link" }}
      >
        <Form.Item
          label="WorkDrive fileId (must be registered in docQ)"
          name="fileId"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Lookup
        </Button>

        {doc ? (
          <Card style={{ marginTop: 16 }} size="small" title="docQ record">
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text strong>docType</Typography.Text>: {doc.doc_type}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text strong>state</Typography.Text>: {doc.state}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <Typography.Text strong>WorkDrive URL</Typography.Text>:{" "}
              <Typography.Text code>{doc.workdrive_permalink || "(none set)"}</Typography.Text>
            </Typography.Paragraph>
          </Card>
        ) : null}

        <Form.Item style={{ marginTop: 16 }} label="URL to write" name="url">
          <Input />
        </Form.Item>

        <Form.Item label="ERP DocType" name="erp_doctype">
          <Input placeholder="e.g. Design Document" />
        </Form.Item>

        <Form.Item label="ERP DocName (record name)" name="erp_docname">
          <Input placeholder="e.g. DD-0001" />
        </Form.Item>

        <Form.Item label="ERP field name" name="fieldname">
          <Input placeholder="workdrive_link" />
        </Form.Item>

        <Button type="default" onClick={writeToERPNext} loading={saving}>
          Write link to ERPNext + record in docQ
        </Button>
      </Form>
    </Card>
  );
}

