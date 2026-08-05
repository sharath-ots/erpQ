"use client";

import { Button, Card, Form, Input, Table, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";

export default function DocTypeAdmin() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(docPath("/doc-types"));
      const json = await res.json();
      setTypes(json.docTypes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(values) {
    try {
      const res = await apiFetch(docPath(`/doc-types/${values.docType}`), {
        method: "PUT",
        body: JSON.stringify({
          label: values.label,
          description: values.description,
          requiredFields: values.requiredFields
            ? values.requiredFields.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || res.statusText);
      }
      message.success("Saved");
      form.resetFields();
      load();
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  return (
    <Card title="Document types">
      <Table
        rowKey="doc_type"
        loading={loading}
        dataSource={types}
        columns={[
          { title: "Key", dataIndex: "doc_type" },
          { title: "Label", dataIndex: "label" },
          { title: "Description", dataIndex: "description" },
        ]}
        pagination={false}
        style={{ marginBottom: 24 }}
      />
      <Form form={form} layout="vertical" onFinish={save} style={{ maxWidth: 480 }}>
        <Form.Item name="docType" label="Type key" rules={[{ required: true }]}>
          <Input placeholder="e.g. contract" />
        </Form.Item>
        <Form.Item name="label" label="Label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="requiredFields" label="Required fields (comma-separated)">
          <Input placeholder="title, department, version_label" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Save type
        </Button>
      </Form>
    </Card>
  );
}
