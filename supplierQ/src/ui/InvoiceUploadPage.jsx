"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import {
  fetchSupplierContext,
  fetchSupplierPurchaseOrders,
  submitSupplierInvoiceWithFile,
} from "../services/supplierMetrics.js";

const { Dragger } = Upload;

export function InvoiceUploadPage({ apiBase, getAccessToken }) {
  const [form] = Form.useForm();
  const [scope, setScope] = useState(null);
  const [poOptions, setPoOptions] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ctx, pos] = await Promise.all([
        fetchSupplierContext({ apiBase, getAccessToken }),
        fetchSupplierPurchaseOrders({ apiBase, getAccessToken }),
      ]);
      setScope(ctx);
      setPoOptions(
        (pos.data ?? []).map((po) => ({
          value: po.name,
          label: `${po.name} — ${po.supplier ?? ""} (${po.status ?? ""})`,
        })),
      );
    } catch (e) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAccessToken]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await submitSupplierInvoiceWithFile(
        {
          purchase_order: values.purchase_order,
          supplier: values.supplier,
          company: values.company,
          bill_no: values.bill_no,
          posting_date: values.posting_date,
          due_date: values.due_date,
        },
        file,
        { apiBase, getAccessToken },
      );
      message.success(`Purchase Invoice ${res.data?.name ?? "created"}`);
      form.resetFields();
      setFile(null);
    } catch (e) {
      message.error(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="UPLOAD INVOICE" loading={loading}>
      <Typography.Paragraph type="secondary" className="!mb-4">
        Create a Purchase Invoice and attach your supplier invoice PDF or image.
        {scope?.supplier ? ` Linked supplier: ${scope.supplierName ?? scope.supplier}.` : null}
      </Typography.Paragraph>
      {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ posting_date: new Date().toISOString().slice(0, 10) }}
      >
        <Form.Item name="purchase_order" label="Purchase Order (optional)">
          <Select
            allowClear
            showSearch
            placeholder="Link to PO — items will be copied"
            options={poOptions}
          />
        </Form.Item>

        {scope?.mode === "admin" ? (
          <Form.Item name="supplier" label="Supplier" rules={[{ required: true }]}>
            <Input placeholder="Supplier ID" />
          </Form.Item>
        ) : null}

        <Form.Item name="bill_no" label="Supplier invoice number" rules={[{ required: true }]}>
          <Input placeholder="Your invoice / bill number" />
        </Form.Item>

        <Form.Item name="company" label="Company">
          <Input placeholder="Company (optional)" />
        </Form.Item>

        <Form.Item name="posting_date" label="Posting date" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="due_date" label="Due date">
          <Input type="date" />
        </Form.Item>

        <Form.Item label="Invoice file (PDF, image)">
          <Dragger
            maxCount={1}
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            onRemove={() => setFile(null)}
            fileList={file ? [{ uid: "1", name: file.name, status: "done" }] : []}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag invoice file here</p>
          </Dragger>
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Upload &amp; create invoice
          </Button>
          <Button onClick={load}>Refresh POs</Button>
        </Space>
      </Form>
    </Card>
  );
}
