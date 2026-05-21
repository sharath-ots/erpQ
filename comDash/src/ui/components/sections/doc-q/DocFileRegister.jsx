"use client";

import { Button, Card, Form, Input, Select, Typography } from "antd";
import { useState } from "react";
import { apiFetch } from "@/lib/apigate";

const DEFAULT_DOC_TYPES = ["design", "policy", "manual"];

export default function DocFileRegister() {
  const [form] = Form.useForm();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFinish(values) {
    setLoading(true);
    setStatus("");
    try {
      const res = await apiFetch(
        `/api/v1/partners/workdrive/api/v1/docs/files/${encodeURIComponent(values.fileId)}/register`,
        {
          method: "POST",
          body: JSON.stringify({
            docType: values.docType,
            title: values.title || undefined,
            permalink: values.permalink || undefined,
            folderId: values.folderId || undefined,
          }),
        },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      setStatus(text);
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Register WorkDrive File">
      <Typography.Paragraph type="secondary">
        This creates/updates a docQ registry record for a WorkDrive fileId, so it can be tracked
        through your workflow states.
      </Typography.Paragraph>

      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{ docType: DEFAULT_DOC_TYPES[0] }}
      >
        <Form.Item
          label="WorkDrive fileId"
          name="fileId"
          rules={[{ required: true, message: "fileId is required" }]}
        >
          <Input placeholder="e.g. 8a... (WorkDrive file id)" />
        </Form.Item>

        <Form.Item
          label="Document type"
          name="docType"
          rules={[{ required: true, message: "docType is required" }]}
        >
          <Select
            options={DEFAULT_DOC_TYPES.map((d) => ({ value: d, label: d }))}
          />
        </Form.Item>

        <Form.Item label="Title (optional)" name="title">
          <Input />
        </Form.Item>

        <Form.Item label="Permalink (optional)" name="permalink">
          <Input />
        </Form.Item>

        <Form.Item label="FolderId (optional)" name="folderId">
          <Input />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Register
        </Button>
      </Form>

      {status ? (
        <Card style={{ marginTop: 16 }} size="small" title="Result">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{status}</pre>
        </Card>
      ) : null}
    </Card>
  );
}

