"use client";

import { Alert, Button, Drawer, Form, Input, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocEmailSelect from "./DocEmailSelect";

/**
 * Side drawer to revoke an approved document into under_revision.
 * Captures reason + assigned author, then calls the transition API.
 */
export default function DocRevokePanel({
  documentId,
  documentTitle,
  currentAuthor,
  versionLabel,
  open,
  onClose,
  onRevoked,
  users = [],
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      assignToEmail: currentAuthor || undefined,
      revokeReason: "",
    });
  }, [open, currentAuthor, form]);

  async function submit(values) {
    if (!documentId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/transition`), {
        method: "POST",
        body: JSON.stringify({
          action: "revoke",
          revokeReason: values.revokeReason,
          assignToEmail: values.assignToEmail,
          comment: values.revokeReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      message.success(
        `Revoked ${versionLabel || "approved version"} → ${json.result?.versionLabel || "under revision"}`,
      );
      form.resetFields();
      onClose?.();
      onRevoked?.(json);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title="Revoke document for revision"
      open={open}
      onClose={onClose}
      width={420}
      destroyOnClose
    >
      <Typography.Paragraph>
        <strong>{documentTitle || "Untitled"}</strong>
        {versionLabel ? (
          <Typography.Text type="secondary"> · Ver {versionLabel}</Typography.Text>
        ) : null}
      </Typography.Paragraph>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="This archives the approved version"
        description="A stamped history snapshot is kept. The document becomes under revision (e.g. 1.0 → 1.1) and re-enters the workflow when the assigned author submits."
      />
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item
          name="revokeReason"
          label="Reason for revoking"
          rules={[{ required: true, message: "Enter a reason" }]}
        >
          <Input.TextArea rows={4} placeholder="Why does this approved document need revision?" />
        </Form.Item>
        <Form.Item
          name="assignToEmail"
          label="Assign to (author)"
          rules={[
            { required: true, message: "Pick who will revise this document" },
            { type: "email", message: "Enter a valid email" },
          ]}
        >
          <DocEmailSelect initialUsers={users} />
        </Form.Item>
        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="primary" danger htmlType="submit" loading={submitting}>
              Revoke
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
