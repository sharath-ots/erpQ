"use client";

import { Button, Card, Form, Input, Switch, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";

export default function DocProjectsAdmin() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(`${docPath("/projects")}?all=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setProjects(json.projects || []);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(values) {
    try {
      const res = await apiFetch(docPath("/projects"), {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          projectKey: values.projectKey || undefined,
          description: values.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          [json.error || res.statusText, json.detail].filter(Boolean).join(" — "),
        );
      }
      message.success("Project created (WorkDrive folder under vault)");
      form.resetFields();
      load();
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  async function toggleActive(row, active) {
    try {
      const res = await apiFetch(docPath(`/projects/${row.id}`), {
        method: "PUT",
        body: JSON.stringify({ active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      message.success(active ? "Project activated" : "Project deactivated");
      load();
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  return (
    <Card title="Projects (admin)">
      <TypographyHint />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={projects}
        pagination={false}
        style={{ marginBottom: 24 }}
        columns={[
          { title: "Key", dataIndex: "project_key", width: 140 },
          { title: "Name", dataIndex: "name" },
          {
            title: "WorkDrive folder",
            dataIndex: "workdrive_folder_id",
            ellipsis: true,
            render: (v) => v || "—",
          },
          {
            title: "Active",
            dataIndex: "active",
            width: 100,
            render: (v, row) => (
              <Switch checked={Boolean(v)} onChange={(on) => toggleActive(row, on)} />
            ),
          },
          {
            title: "Status",
            dataIndex: "active",
            width: 90,
            render: (v) =>
              v ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>,
          },
        ]}
      />
      <Form form={form} layout="vertical" onFinish={createProject} style={{ maxWidth: 480 }}>
        <Form.Item name="name" label="Project name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Q3 Contracts" />
        </Form.Item>
        <Form.Item name="projectKey" label="Key (optional)">
          <Input placeholder="auto from name if empty" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Create project
        </Button>
      </Form>
    </Card>
  );
}

function TypographyHint() {
  return (
    <p style={{ color: "rgba(0,0,0,0.45)", marginBottom: 16 }}>
      Each project creates a folder under the org managed vault (service account). Users can attach
      a project when creating managed documents.
    </p>
  );
}
