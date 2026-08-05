"use client";

import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";

function taskColumns(onAction) {
  return [
    { title: "Document", dataIndex: "title", key: "title" },
    { title: "Type", dataIndex: "doc_type", key: "doc_type" },
    {
      title: "Stage",
      dataIndex: "stage_id",
      key: "stage_id",
      render: (v) => v || "—",
    },
    { title: "Author", dataIndex: "author_email", key: "author_email" },
    {
      title: "Due",
      dataIndex: "due_at",
      key: "due_at",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Space wrap>
          <Button
            size="small"
            type="primary"
            onClick={() => onAction(row, "approve")}
          >
            Approve
          </Button>
          <Button
            size="small"
            onClick={() => onAction(row, "request_changes")}
          >
            Request changes
          </Button>
          <Link href={`/m/docq/documents/${row.document_id}`}>View</Link>
        </Space>
      ),
    },
  ];
}

export default function DocInbox() {
  const [reviewTasks, setReviewTasks] = useState([]);
  const [approvalTasks, setApprovalTasks] = useState([]);
  const [myActive, setMyActive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDoc, setActionDoc] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(docPath("/inbox"));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setReviewTasks(json.pendingReviewTasks || []);
      setApprovalTasks(json.pendingApprovalTasks || []);
      setMyActive(json.myActiveDocuments || []);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAction(row, type) {
    setActionDoc(row);
    setActionType(type);
    form.resetFields();
  }

  async function runTransition(values) {
    if (!actionDoc) return;
    try {
      const body = {
        action: actionType,
        comment: values.comment,
      };
      if (actionType === "request_changes" && values.comment) {
        body.reviewPoints = values.comment
          .split(/\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const res = await apiFetch(docPath(`/documents/${actionDoc.document_id}/transition`), {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      message.success("Done");
      setActionDoc(null);
      form.resetFields();
      load();
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  const myCols = [
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (s) => <Tag>{s}</Tag>,
    },
    {
      title: "",
      key: "link",
      render: (_, row) => (
        <Link href={`/m/docq/documents/${row.id}`}>Open</Link>
      ),
    },
  ];

  const cols = taskColumns(openAction);

  return (
    <>
      <Card title="Inbox" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          Review and approval tasks assigned to you. Approve to advance the workflow, or request
          changes with one review point per line.
        </Typography.Paragraph>
        <Tabs
          items={[
            {
              key: "review",
              label: `Review (${reviewTasks.length})`,
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={reviewTasks}
                  columns={cols}
                  pagination={false}
                />
              ),
            },
            {
              key: "approval",
              label: `Approval (${approvalTasks.length})`,
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={approvalTasks}
                  columns={cols}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>
      <Card title="My active documents">
        <Table rowKey="id" dataSource={myActive} columns={myCols} pagination={false} />
      </Card>

      <Modal
        open={Boolean(actionDoc)}
        title={actionType === "approve" ? "Approve" : "Request changes"}
        onCancel={() => setActionDoc(null)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={runTransition}>
          <Form.Item
            name="comment"
            label={
              actionType === "request_changes"
                ? "Review points (one per line)"
                : "Comment (optional)"
            }
            rules={
              actionType === "request_changes"
                ? [{ required: true, message: "Enter at least one review point" }]
                : []
            }
          >
            <Input.TextArea
              rows={actionType === "request_changes" ? 5 : 3}
              placeholder={
                actionType === "request_changes"
                  ? "Fix section 2 wording\nAdd missing signature block"
                  : undefined
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
