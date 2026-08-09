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

export default function DocSharePanel({
  items = [],
  open,
  onClose,
  onChanged,
}) {
  const [form] = Form.useForm();
  const [shares, setShares] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const isSingleItem = items.length === 1;
  const singleItem = isSingleItem ? items[0] : null;

  const load = useCallback(async () => {
    if (!isSingleItem || !singleItem?.id) {
      setShares([]);
      return;
    }
    
    setLoading(true);
    try {
      // Route files to /documents and folders to /scratch/folders
      const basePath = singleItem.type === "folder" 
        ? `/scratch/folders/${singleItem.id}` 
        : `/documents/${singleItem.id}`;
      
      const res = await apiFetch(docPath(`${basePath}/shares`));
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || json.detail || `Server error: ${res.status}`);
      }
      
      setShares(json.shares || []);
    } catch (e) {
      message.error(`Failed to load permissions: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [items, isSingleItem, singleItem]);

  useEffect(() => {
    if (!open) return;
    load();
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [open, load]);

  async function addShare(values) {
    if (!items.length) return;
    setAdding(true);
    let successCount = 0;
    
    try {
      for (const item of items) {
        const basePath = item.type === "folder" 
          ? `/scratch/folders/${item.id}` 
          : `/documents/${item.id}`;

        const res = await apiFetch(docPath(`${basePath}/shares`), {
          method: "POST",
          body: JSON.stringify({
            granteeEmail: values.granteeEmail,
            permission: values.permission || "read",
          }),
        });
        
        const json = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          throw new Error(json.error || json.detail || `Server error: ${res.status}`);
        }
        successCount++;
      }

      message.success(`Successfully shared ${successCount} item(s) with ${values.granteeEmail}`);
      form.resetFields();
      await load();
      onChanged?.();
      
      if (!isSingleItem) {
        onClose(); 
      }
    } catch (e) {
      message.error(`Sharing failed: ${e.message}`);
    } finally {
      setAdding(false);
    }
  }

  async function removeShare(shareId) {
    if (!isSingleItem) return;
    try {
      const basePath = singleItem.type === "folder" 
        ? `/scratch/folders/${singleItem.id}` 
        : `/documents/${singleItem.id}`;

      const res = await apiFetch(
        docPath(`${basePath}/shares/${shareId}`),
        { method: "DELETE" },
      );
      
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.detail || `Server error: ${res.status}`);
      }
      
      message.success("Access successfully removed");
      await load();
      onChanged?.();
    } catch (e) {
      message.error(`Failed to remove access: ${e.message}`);
    }
  }

  return (
    <Drawer
      title={
        <Space direction="vertical" size={0}>
          <span>{isSingleItem ? "Share" : `Share ${items.length} items`}</span>
          {isSingleItem && singleItem?.title ? (
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {singleItem.title}
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

      {isSingleItem ? (
        <>
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
        </>
      ) : (
        <Typography.Paragraph type="secondary" style={{ marginTop: 24 }}>
          Existing permissions are not shown when sharing multiple items. Setting access here will grant permissions to all selected files and folders.
        </Typography.Paragraph>
      )}
    </Drawer>
  );
}