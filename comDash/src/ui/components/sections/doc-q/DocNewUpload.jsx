"use client";

import { Button, Card, Col, Form, Input, Row, Select, Upload, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getAccessToken, parseCityQJwtPayload } from "@/lib/apigate";
import { docPath } from "./docQApi";

export default function DocNewUpload() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const session = parseCityQJwtPayload(getAccessToken());

  useEffect(() => {
    apiFetch(docPath("/doc-types"))
      .then((r) => r.json())
      .then((j) => {
        const types = j.docTypes || [];
        setDocTypes(types);
        if (types.length && !form.getFieldValue("docType")) {
          form.setFieldValue("docType", types[0].doc_type);
        }
      })
      .catch(() => {
        setDocTypes([
          { doc_type: "general", label: "General" },
          { doc_type: "manual", label: "Manual" },
          { doc_type: "contract", label: "Contract" },
        ]);
      });
    apiFetch(docPath("/projects"))
      .then((r) => r.json())
      .then((j) => setProjects(j.projects || []))
      .catch(() => setProjects([]));
  }, [form]);

  async function onFinish(values) {
    if (!file) {
      message.error("Select a file");
      return;
    }
    setLoading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("docType", values.docType);
      uploadForm.append("title", values.title);
      if (values.description) uploadForm.append("description", values.description);
      if (values.department) uploadForm.append("department", values.department);
      if (values.classification) uploadForm.append("classification", values.classification);
      if (values.referenceNumber) uploadForm.append("referenceNumber", values.referenceNumber);
      if (values.tags?.length) uploadForm.append("tags", JSON.stringify(values.tags));
      if (values.projectId) uploadForm.append("projectId", values.projectId);

      const res = await apiFetch(docPath("/documents/create-managed"), {
        method: "POST",
        body: uploadForm,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof json.detail === "string"
            ? json.detail
            : json.detail
              ? JSON.stringify(json.detail).slice(0, 200)
              : "";
        throw new Error(
          [json.error || res.statusText, detail].filter(Boolean).join(" — "),
        );
      }
      if (!json.document?.id) {
        throw new Error("Document was uploaded but not saved (missing id)");
      }

      message.success("Document created — open it and click Submit for review");
      router.push(`/m/docq/documents/${json.document.id}`);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Create documents">
      <Typography.Paragraph type="secondary">
        Fill in metadata and attach the file. The document starts as a draft; open it and use
        <strong> Submit for review</strong> when ready.
      </Typography.Paragraph>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Document title" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="docType" label="Document type" rules={[{ required: true }]} initialValue="general">
              <Select
                options={docTypes.map((t) => ({
                  value: t.doc_type,
                  label: t.label || t.doc_type,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="projectId" label="Project (optional)">
              <Select
                allowClear
                placeholder="Managed vault root if empty"
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.name || p.project_key,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="department" label="Department">
              <Input placeholder="e.g. Engineering" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="classification" label="Classification">
              <Select
                allowClear
                placeholder="Optional"
                options={[
                  { value: "internal", label: "Internal" },
                  { value: "confidential", label: "Confidential" },
                  { value: "public", label: "Public" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="referenceNumber" label="Reference no.">
              <Input placeholder="Optional" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="tags" label="Tags">
              <Select mode="tags" placeholder="Add tags" tokenSeparators={[","]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Author">
              <Input value={session?.email || ""} disabled />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Purpose, scope, or summary" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="File" required>
              <Upload
                beforeUpload={(f) => {
                  setFile(f);
                  if (!form.getFieldValue("title")) form.setFieldValue("title", f.name);
                  return false;
                }}
                maxCount={1}
                onRemove={() => setFile(null)}
              >
                <Button>Select file</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={loading}>
          Create draft
        </Button>
      </Form>
    </Card>
  );
}
