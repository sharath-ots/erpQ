"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { displayStatus } from "./docStatus";
import DocEmailSelect from "./DocEmailSelect";

export default function DocWorkflowBanner({
  doc,
  data,
  users = [],
  loading = false,
  onTransition,
  onRevoke,
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  if (!doc) return null;

  const pendingTask = data?.currentUserPendingTask;
  const status = displayStatus(doc);
  const openReviewPoints = (data?.reviewPoints || []).filter((p) => p.status === "open");

  let headline = "";
  let description = "";
  let actions = null;

  if (doc.zone === "scratch") {
    headline = "Scratch file — not in workflow yet";
    description = "Promote this file to a managed document before submitting for review.";
  } else if (doc.state === "under_revision" && data?.authorCanEdit) {
    headline = "Under revision";
    description = doc.revoke_reason
      ? `This document was revoked for revision. Reason: ${doc.revoke_reason}. Update metadata/file as needed, then submit to re-enter the workflow.`
      : "This document was revoked for revision. Update metadata/file as needed, then submit to re-enter the workflow.";
    actions = (
      <Button type="primary" size="large" loading={loading} onClick={() => setSubmitOpen(true)}>
        Submit revised document
      </Button>
    );
  } else if (doc.state === "draft" && data?.authorCanEdit) {
    headline = "Ready to submit";
    description =
      "This document is a draft. When metadata and file are complete, submit it to start the review workflow. Reviewers and approvers are assigned automatically from the document type workflow.";
    actions = (
      <Button type="primary" size="large" loading={loading} onClick={() => setSubmitOpen(true)}>
        Submit for review
      </Button>
    );
  } else if (doc.state === "changes_requested" && data?.authorCanEdit) {
    headline = "Changes requested — with you";
    description = `Fix the open review point(s), update the file if needed, then resubmit.`;
    actions = (
      <Button
        type="primary"
        size="large"
        loading={loading}
        onClick={() => onTransition("resubmit", { comment: "" })}
      >
        Resubmit for review
      </Button>
    );
  } else if (pendingTask) {
    const roleLabel = pendingTask.role === "approver" ? "approval" : "review";
    headline = `Action required — ${roleLabel}`;
    description =
      pendingTask.role === "approver"
        ? "You are the current approver. Approve to advance or send back with review points."
        : "You are assigned as reviewer. Complete your review or send back with review points.";
    actions = (
      <Space wrap>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={() => onTransition("approve", {})}
        >
          {pendingTask.role === "approver" ? "Approve" : "Approve review"}
        </Button>
        <Button size="large" disabled={loading} onClick={() => setReviewOpen(true)}>
          Request changes
        </Button>
      </Space>
    );
  } else if (doc.state === "in_review") {
    headline = "In workflow";
    description = `Waiting on ${doc.current_approver_email || "assignee(s)"}. Stage: ${doc.workflow_stage || "—"}.`;
  } else if (doc.state === "approved") {
    headline = "Approved";
    description =
      "This document is approved and locked. Revoke it only when a controlled revision is needed.";
    actions = (
      <Space wrap>
        {data?.canRevoke ? (
          <Button danger size="large" loading={loading} onClick={() => onRevoke?.()}>
            Revoke
          </Button>
        ) : null}
        <Button loading={loading} onClick={() => onTransition("archive", {})}>
          Archive document
        </Button>
      </Space>
    );
  }

  if (!headline) return null;

  return (
    <>
      <Card
        style={{
          borderLeft: "4px solid var(--ant-color-primary)",
          marginBottom: 0,
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap align="center">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {headline}
            </Typography.Title>
            <Tag color={status.color}>{status.label}</Tag>
            {doc.workflow_stage ? (
              <Tag color="blue">{doc.workflow_stage}</Tag>
            ) : null}
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {description}
          </Typography.Paragraph>
          {openReviewPoints.length ? (
            <Alert
              type="warning"
              showIcon
              message={`${openReviewPoints.length} review point(s) to address`}
              description={
                <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  {openReviewPoints.slice(0, 5).map((p) => (
                    <li key={p.id}>{p.body}</li>
                  ))}
                </ul>
              }
            />
          ) : null}
          {actions}
        </Space>
      </Card>

      <Modal
        title="Submit for review"
        open={submitOpen}
        onCancel={() => setSubmitOpen(false)}
        onOk={() => submitForm.submit()}
        okText="Submit"
      >
        <Form
          form={submitForm}
          layout="vertical"
          onFinish={(v) => {
            onTransition("submit", {
              comment: v.comment,
              firstApproverEmail: v.firstApproverEmail,
            });
            setSubmitOpen(false);
          }}
        >
          <Typography.Paragraph type="secondary">
            Workflow assignees come from the document type preset. Only pick a first approver if
            no workflow is configured for this type.
          </Typography.Paragraph>
          <Form.Item name="firstApproverEmail" label="First approver (optional)">
            <DocEmailSelect initialUsers={users} />
          </Form.Item>
          <Form.Item name="comment" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Request changes"
        open={reviewOpen}
        onCancel={() => setReviewOpen(false)}
        onOk={() => reviewForm.submit()}
        okText="Send back to author"
      >
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={(v) => {
            onTransition("request_changes", {
              comment: v.comment,
              reviewPoints: String(v.comment || "")
                .split(/\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            });
            setReviewOpen(false);
          }}
        >
          <Form.Item
            name="comment"
            label="Review points (one per line)"
            rules={[{ required: true, message: "Enter at least one review point" }]}
          >
            <Input.TextArea rows={5} placeholder="Fix section 2&#10;Add signature block" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
