"use client";

import { Alert, Button, Card, Form, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken, parseCityQJwtPayload } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocEmailSelect from "./DocEmailSelect";

const DOC_TYPES = ["design", "cad", "general", "manual", "policy", "spec", "contract"];
const ROLE_OPTIONS = [
  { value: "Manager", label: "Manager" },
  { value: "Design Manager", label: "Design Manager" },
];

function buildDefinition(values) {
  const stages = [];
  if (values.reviewEnabled) {
    stages.push({
      id: "review",
      label: "Review",
      role: "reviewer",
      mode: values.reviewMode,
      assignees: [
        {
          type: values.reviewAssigneeType,
          value: values.reviewAssigneeValue || undefined,
          departmentFromDoc: values.reviewAssigneeType !== "user",
        },
      ],
      allowSendBack: true,
      sendBackTargets: ["author"],
    });
  }
  stages.push({
    id: "approval",
    label: "Approval",
    role: "approver",
    mode: values.approvalMode,
    assignees: [
      {
        type: values.approvalAssigneeType,
        value: values.approvalAssigneeValue || (values.approvalAssigneeType === "role" ? "Manager" : undefined),
        departmentFromDoc: values.approvalAssigneeType !== "user",
      },
    ],
    allowSendBack: true,
    sendBackTargets: ["author"],
    onResubmit: "return_to_approval",
  });

  const revokeEmails = Array.isArray(values.revokeEmails)
    ? values.revokeEmails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const allowedRevokers = [];
  if (values.revokeAssigneeType === "role" && values.revokeAssigneeValue) {
    allowedRevokers.push({
      type: "role",
      value: values.revokeAssigneeValue,
      departmentFromDoc: true,
    });
  } else if (values.revokeAssigneeType === "reports_to") {
    allowedRevokers.push({ type: "reports_to" });
  }
  for (const email of revokeEmails) {
    allowedRevokers.push({ type: "user", value: email });
  }

  return {
    version: 2,
    stages,
    rules: { slaDays: values.slaDays || 5 },
    revoke: { allowedRevokers },
  };
}

export default function DocWorkflowSetup() {
  const [form] = Form.useForm();
  const [docType, setDocType] = useState("design");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [listMeta, setListMeta] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const isAdmin = parseCityQJwtPayload(getAccessToken())?.isDocAdmin;

  const loadWorkflows = useCallback(async () => {
    setWorkflowsLoading(true);
    try {
      const res = await apiFetch(docPath("/workflows"));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setWorkflows(json.workflows || []);
      return json.workflows || [];
    } catch (e) {
      message.error("Could not load workflows: " + String(e.message || e));
      return [];
    } finally {
      setWorkflowsLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then((r) => r.json())
      .then((j) => {
        setUsers(j.users || []);
        setListMeta(j.meta || null);
      })
      .catch(() => {});
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    const wf = workflows.find((w) => w.doc_type === docType);
    const d = wf?.definition || {};
    const review = (d.stages || []).find((s) => s.id === "review");
    const approval = (d.stages || []).find((s) => s.id === "approval") || {};
    const revokers = Array.isArray(d.revoke?.allowedRevokers) ? d.revoke.allowedRevokers : [];
    const revokeUsers = revokers.filter((r) => r.type === "user").map((r) => r.value).filter(Boolean);
    const revokeRole = revokers.find((r) => r.type === "role");
    const revokeReportsTo = revokers.find((r) => r.type === "reports_to");
    form.setFieldsValue({
      reviewEnabled: Boolean(review),
      reviewMode: review?.mode || "parallel",
      reviewAssigneeType: review?.assignees?.[0]?.type || "reports_to",
      reviewAssigneeValue: review?.assignees?.[0]?.value || "",
      approvalMode: approval.mode || "sequential",
      approvalAssigneeType: approval.assignees?.[0]?.type || "role",
      approvalAssigneeValue: approval.assignees?.[0]?.value || "Manager",
      slaDays: d.rules?.slaDays || 5,
      revokeAssigneeType: revokeRole
        ? "role"
        : revokeReportsTo
          ? "reports_to"
          : "user",
      revokeAssigneeValue: revokeRole?.value || "",
      revokeEmails: revokeUsers,
    });
  }, [docType, form, workflows]);

  async function save(values) {
    setLoading(true);
    try {
      const res = await apiFetch(docPath(`/workflows/${encodeURIComponent(docType)}`), {
        method: "PUT",
        body: JSON.stringify({ definition: buildDefinition(values) }),
      });
      let json = null;
      try {
        json = await res.clone().json();
      } catch {
        // non-JSON error body
      }
      if (!res.ok) {
        const detail = json?.error || json?.detail || (await res.text()) || res.statusText;
        if (res.status === 403) {
          throw new Error(
            "Not allowed (403). Your account is not a docQ admin on the server. Sign out and back in after being added to AUTHQ_DOCQ_ADMIN_EMAILS.",
          );
        }
        throw new Error(detail);
      }
      message.success(`Workflow saved for “${docType}”`);
      await loadWorkflows();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function summarizeStages(definition) {
    const stages = definition?.stages || [];
    if (!stages.length) return "—";
    const stageText = stages
      .map((s) => {
        const who = s.assignees?.[0];
        const target =
          who?.type === "user"
            ? who.value
            : who?.type === "role"
              ? `role: ${who.value}`
              : who?.type === "reports_to"
                ? "author's manager"
                : who?.type || "?";
        return `${s.label || s.id} (${s.mode || "?"} → ${target})`;
      })
      .join("  •  ");
    const revokers = definition?.revoke?.allowedRevokers || [];
    if (!revokers.length) return stageText;
    const revokeText = revokers
      .map((r) =>
        r.type === "user"
          ? r.value
          : r.type === "role"
            ? `role: ${r.value}`
            : r.type === "reports_to"
              ? "author's manager"
              : r.type,
      )
      .join(", ");
    return `${stageText}  •  revoke: ${revokeText}`;
  }

  if (!isAdmin) {
    return (
      <Card title="Workflow management">
        <Alert
          type="warning"
          message="Admin only"
          description="Ask your IT admin to configure document workflows."
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Saved workflows"
        extra={
          <Button size="small" onClick={loadWorkflows} loading={workflowsLoading}>
            Refresh
          </Button>
        }
      >
        <Table
          rowKey="doc_type"
          size="small"
          loading={workflowsLoading}
          dataSource={workflows}
          pagination={false}
          locale={{ emptyText: "No workflows saved yet. Configure one below and click Save workflow." }}
          columns={[
            {
              title: "Document type",
              dataIndex: "doc_type",
              width: 140,
              render: (v) => <Tag color="blue">{v}</Tag>,
            },
            {
              title: "Stages",
              key: "stages",
              render: (_, row) => summarizeStages(row.definition),
            },
            {
              title: "Updated",
              dataIndex: "updated_at",
              width: 170,
              render: (v) => (v ? new Date(v).toLocaleString() : "—"),
            },
            {
              title: "By",
              dataIndex: "updated_by_email",
              width: 200,
              render: (v) => v || "—",
            },
            {
              title: "",
              key: "edit",
              width: 70,
              render: (_, row) => (
                <a onClick={() => setDocType(row.doc_type)}>Edit</a>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Workflow management">
        <Typography.Paragraph type="secondary">
          Set how documents move through review and approval. Authors only pick the document type when
          uploading — they never edit this screen.
        </Typography.Paragraph>
      {listMeta?.criteria ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Who appears in the email list"
          description={
            <>
              {listMeta.criteria}
              {listMeta.domain ? (
                <>
                  {" "}
                  Currently scoped to <strong>@{listMeta.domain}</strong>. You can still type any
                  email that is not in the list.
                </>
              ) : null}
            </>
          }
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        initialValues={{
          reviewEnabled: true,
          reviewMode: "parallel",
          reviewAssigneeType: "reports_to",
          approvalMode: "sequential",
          approvalAssigneeType: "role",
          approvalAssigneeValue: "Manager",
          slaDays: 5,
          revokeAssigneeType: "user",
          revokeEmails: [],
        }}
      >
        <Form.Item label="Document type">
          <Select
            value={docType}
            onChange={setDocType}
            options={DOC_TYPES.map((d) => ({ value: d, label: d }))}
            style={{ maxWidth: 240 }}
          />
        </Form.Item>

        <Typography.Title level={5}>Review stage</Typography.Title>
        <Form.Item name="reviewEnabled" label="Enable peer/manager review before approval">
          <Select
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No — go straight to approval" },
            ]}
            style={{ maxWidth: 320 }}
          />
        </Form.Item>
        <Form.Item name="reviewMode" label="Review mode">
          <Select
            options={[
              { value: "parallel", label: "All reviewers at once" },
              { value: "sequential", label: "One after another" },
            ]}
            style={{ maxWidth: 320 }}
          />
        </Form.Item>
        <Form.Item name="reviewAssigneeType" label="Who reviews?">
          <Select
            options={[
              { value: "reports_to", label: "Author's manager (from org chart)" },
              { value: "role", label: "By job role" },
              { value: "user", label: "Specific person" },
            ]}
            style={{ maxWidth: 320 }}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.reviewAssigneeType !== b.reviewAssigneeType}>
          {({ getFieldValue }) => {
            const type = getFieldValue("reviewAssigneeType");
            if (type === "user") {
              return (
                <Form.Item
                  name="reviewAssigneeValue"
                  label="Reviewer email"
                  rules={[
                    { required: true, message: "Pick or type a reviewer email" },
                    { type: "email", message: "Enter a valid email" },
                  ]}
                >
                  <DocEmailSelect initialUsers={users} style={{ maxWidth: 400 }} />
                </Form.Item>
              );
            }
            if (type === "role") {
              return (
                <Form.Item name="reviewAssigneeValue" label="Role name">
                  <Select
                    allowClear
                    showSearch
                    options={ROLE_OPTIONS}
                    style={{ maxWidth: 320 }}
                  />
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>

        <Typography.Title level={5}>Approval stage</Typography.Title>
        <Form.Item name="approvalMode" label="Approval mode">
          <Select
            options={[
              { value: "sequential", label: "Sequential approvers" },
              { value: "parallel", label: "All approvers at once" },
            ]}
            style={{ maxWidth: 320 }}
          />
        </Form.Item>
        <Form.Item name="approvalAssigneeType" label="Who approves?">
          <Select
            options={[
              { value: "role", label: "By job role" },
              { value: "reports_to", label: "Author's manager" },
              { value: "user", label: "Specific person" },
            ]}
            style={{ maxWidth: 320 }}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.approvalAssigneeType !== b.approvalAssigneeType}>
          {({ getFieldValue }) => {
            const type = getFieldValue("approvalAssigneeType");
            if (type === "user") {
              return (
                <Form.Item
                  name="approvalAssigneeValue"
                  label="Approver email"
                  rules={[
                    { required: true, message: "Pick or type an approver email" },
                    { type: "email", message: "Enter a valid email" },
                  ]}
                >
                  <DocEmailSelect initialUsers={users} style={{ maxWidth: 400 }} />
                </Form.Item>
              );
            }
            if (type === "role") {
              return (
                <Form.Item name="approvalAssigneeValue" label="Role name">
                  <Select
                    allowClear
                    showSearch
                    options={ROLE_OPTIONS}
                    style={{ maxWidth: 320 }}
                  />
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>

        <Form.Item name="slaDays" label="Days before task is overdue">
          <InputNumber min={1} max={30} />
        </Form.Item>

        <Typography.Title level={5}>Who can revoke after approval</Typography.Title>
        <Typography.Paragraph type="secondary">
          After a document is approved it is locked. These people (plus docQ admins) can revoke it
          into under-revision so an assigned author can update and resubmit.
        </Typography.Paragraph>
        <Form.Item name="revokeAssigneeType" label="Primary revoker rule">
          <Select
            options={[
              { value: "user", label: "Specific people only (emails below)" },
              { value: "role", label: "By job role (+ optional emails)" },
              { value: "reports_to", label: "Author's manager (+ optional emails)" },
            ]}
            style={{ maxWidth: 360 }}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.revokeAssigneeType !== b.revokeAssigneeType}>
          {({ getFieldValue }) => {
            if (getFieldValue("revokeAssigneeType") !== "role") return null;
            return (
              <Form.Item name="revokeAssigneeValue" label="Revoker role name">
                <Select allowClear showSearch options={ROLE_OPTIONS} style={{ maxWidth: 320 }} />
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item name="revokeEmails" label="Additional revoker emails">
          <Select
            mode="tags"
            tokenSeparators={[",", " "]}
            placeholder="type or pick emails"
            style={{ maxWidth: 480 }}
            options={users.map((u) => ({
              value: u.email,
              label: u.name ? `${u.name} <${u.email}>` : u.email,
            }))}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Save workflow
        </Button>
      </Form>
      </Card>
    </Space>
  );
}
