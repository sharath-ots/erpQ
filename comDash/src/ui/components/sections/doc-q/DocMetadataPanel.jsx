"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Upload,
  Tag,
  message,
} from "antd";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import { displayStatus, formatDate } from "./docStatus";

function formatTags(tags) {
  if (!tags) return "—";
  if (Array.isArray(tags)) return tags.length ? tags.join(", ") : "—";
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) && parsed.length ? parsed.join(", ") : "—";
  } catch {
    return String(tags);
  }
}

function tagsEqual(a, b) {
  const aa = Array.isArray(a) ? a.map(String) : [];
  const bb = Array.isArray(b) ? b.map(String) : [];
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

const DocMetadataPanel = forwardRef(function DocMetadataPanel(
  { documentId, data, onUpdated },
  ref,
) {
  const [form] = Form.useForm();
  const [docTypes, setDocTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const doc = data?.document;
  const canEdit = Boolean(data?.authorCanEdit);
  const status = displayStatus(doc);

  useEffect(() => {
    apiFetch(docPath("/doc-types"))
      .then((r) => r.json())
      .then((j) => setDocTypes(j.docTypes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!doc) return;
    let tags = doc.tags;
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = [];
      }
    }
    form.setFieldsValue({
      title: doc.title,
      docType: doc.doc_type,
      description: doc.description,
      department: doc.department,
      classification: doc.classification,
      referenceNumber: doc.reference_number,
      tags: Array.isArray(tags) ? tags : [],
    });
  }, [doc, form]);

  function isDirty(values) {
    if (!doc) return false;
    let docTags = doc.tags;
    if (typeof docTags === "string") {
      try {
        docTags = JSON.parse(docTags);
      } catch {
        docTags = [];
      }
    }
    return (
      String(values.title || "") !== String(doc.title || "") ||
      String(values.docType || "") !== String(doc.doc_type || "") ||
      String(values.description || "") !== String(doc.description || "") ||
      String(values.department || "") !== String(doc.department || "") ||
      String(values.classification || "") !== String(doc.classification || "") ||
      String(values.referenceNumber || "") !== String(doc.reference_number || "") ||
      !tagsEqual(values.tags, docTags)
    );
  }

  async function patchMetadata(values, { silent = false } = {}) {
    const res = await apiFetch(docPath(`/documents/${documentId}`), {
      method: "PATCH",
      body: JSON.stringify({
        title: values.title,
        doc_type: values.docType,
        description: values.description,
        department: values.department,
        classification: values.classification,
        reference_number: values.referenceNumber,
        tags: values.tags,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
    if (!silent) message.success("Metadata saved");
    onUpdated?.();
    return true;
  }

  async function saveMetadata(values) {
    setSaving(true);
    try {
      await patchMetadata(values);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    /**
     * Validate + save pending metadata before workflow submit/resubmit.
     * @returns {Promise<{ ok: boolean, saved: boolean, error?: string }>}
     */
    async flushSave() {
      if (!canEdit || !doc) return { ok: true, saved: false };
      try {
        const values = await form.validateFields();
        if (!isDirty(values)) return { ok: true, saved: false };
        setSaving(true);
        await patchMetadata(values, { silent: true });
        return { ok: true, saved: true };
      } catch (e) {
        const errMsg =
          e?.errorFields?.[0]?.errors?.[0] ||
          e?.message ||
          "Could not save metadata";
        message.error(String(errMsg));
        return { ok: false, saved: false, error: String(errMsg) };
      } finally {
        setSaving(false);
      }
    },
  }));

  async function uploadVersion(file) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(docPath(`/documents/${documentId}/versions`), {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      message.success("New version uploaded");
      onUpdated?.();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setUploading(false);
    }
    return false;
  }

  if (!doc) return null;

  if (!canEdit) {
    const locked = doc.state === "approved" || doc.state === "archived";
    return (
      <Card title="Document metadata">
        {locked ? (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message={doc.state === "approved" ? "Approved — locked" : "Archived — locked"}
            description="This document is finalised. Metadata, files and versions can no longer be changed."
          />
        ) : null}
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
          <Descriptions.Item label="Title">{doc.title || "—"}</Descriptions.Item>
          <Descriptions.Item label="Type">{doc.doc_type}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={status.color}>{status.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Author">{doc.author_email}</Descriptions.Item>
          <Descriptions.Item label="Created">{formatDate(doc.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Department">{doc.department || "—"}</Descriptions.Item>
          <Descriptions.Item label="Classification">{doc.classification || "—"}</Descriptions.Item>
          <Descriptions.Item label="Reference">{doc.reference_number || "—"}</Descriptions.Item>
          <Descriptions.Item label="Tags">{formatTags(doc.tags)}</Descriptions.Item>
          <Descriptions.Item label="Description" span={3}>
            {doc.description || "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  }

  return (
    <Card title="Document metadata">
      {doc.state === "changes_requested" ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Changes requested"
          description="Update metadata and upload a revised file, then use Resubmit for review in the action banner above."
        />
      ) : null}

      <Form form={form} layout="vertical" onFinish={saveMetadata}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="docType" label="Document type" rules={[{ required: true }]}>
              <Select
                options={docTypes.map((t) => ({
                  value: t.doc_type,
                  label: t.label || t.doc_type,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="department" label="Department">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="classification" label="Classification">
              <Select
                allowClear
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
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="tags" label="Tags">
              <Select mode="tags" tokenSeparators={[","]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Author">
              <Input value={doc.author_email} disabled />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Created">
              <Input value={formatDate(doc.created_at)} disabled />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16} align="middle">
          <Col>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save metadata
            </Button>
          </Col>
          <Col>
            <Upload beforeUpload={uploadVersion} showUploadList={false} maxCount={1}>
              <Button loading={uploading}>Upload new version</Button>
            </Upload>
          </Col>
        </Row>
      </Form>
    </Card>
  );
});

export default DocMetadataPanel;
