"use client";

import {
  Avatar,
  Button,
  Drawer,
  Empty,
  Form,
  List,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocEmailSelect from "./DocEmailSelect";

const PERMISSION_LABEL = {
  read: { label: "Viewer", color: "blue" },
  write: { label: "Editor", color: "gold" },
  approve: { label: "Approver", color: "green" },
};

function initialFor(email) {
  const s = String(email || "?").trim();
  return s ? s[0].toUpperCase() : "?";
}

/**
 * Google-Drive-style sharing drawer. Works for managed and dump (unmanaged) documents —
 * the owner (or an admin) can share either. Opens from the right so it sits beside the file.
 */
export default function DocSharePanel({
  documentId,
  documentTitle,
  open,
  onClose,
  onChanged,
}) {
  const [form] = Form.useForm();
  const [shares, setShares] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/shares`));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setShares(json.shares || []);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    load();
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [open, load]);

  async function addShare(values) {
    setAdding(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/shares`), {
        method: "POST",
        body: JSON.stringify({
          granteeEmail: values.granteeEmail,
          permission: values.permission || "read",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      message.success(`Shared with ${values.granteeEmail}`);
      form.resetFields();
      await load();
      onChanged?.();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setAdding(false);
    }
  }

  async function removeShare(shareId) {
    try {
      const res = await apiFetch(
        docPath(`/documents/${documentId}/shares/${shareId}`),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || res.statusText);
      }
      message.success("Access removed");
      await load();
      onChanged?.();
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  return (
    <Drawer
      title={
        <Space direction="vertical" size={0}>
          <span>Share</span>
          {documentTitle ? (
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {documentTitle}
            </Typography.Text>
          ) : null}
        </Space>
      }
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={addShare}
        initialValues={{ permission: "read" }}
      >
        <Form.Item
          name="granteeEmail"
          label="Add people"
          rules={[
            { required: true, message: "Pick or type an email" },
            { type: "email", message: "Enter a valid email" },
          ]}
        >
          <DocEmailSelect
            initialUsers={users}
            placeholder="Add people by email"
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
          <Form.Item name="permission" label="Access" style={{ marginBottom: 0 }}>
            <Select
              style={{ width: 150 }}
              options={[
                { value: "read", label: "Viewer" },
                { value: "write", label: "Editor" },
                { value: "approve", label: "Approver" },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={adding} style={{ marginTop: 30 }}>
            Share
          </Button>
        </Space>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        People with access
      </Typography.Title>
      {!loading && !shares.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Only you have access"
        />
      ) : (
        <List
          loading={loading}
          dataSource={shares}
          rowKey="id"
          renderItem={(s) => {
            const perm = PERMISSION_LABEL[s.permission] || {
              label: s.permission,
              color: "default",
            };
            const who = s.grantee_email || s.grantee_department || "—";
            return (
              <List.Item
                actions={[
                  <Popconfirm
                    key="remove"
                    title="Remove access?"
                    onConfirm={() => removeShare(s.id)}
                    okText="Remove"
                  >
                    <Button type="text" danger size="small">
                      Remove
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{initialFor(who)}</Avatar>}
                  title={who}
                  description={<Tag color={perm.color}>{perm.label}</Tag>}
                />
              </List.Item>
            );
          }}
        />
      )}
    </Drawer>
  );
}
