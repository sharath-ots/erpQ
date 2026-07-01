"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import {
  fetchSupplierContext,
  fetchSupplierRfqs,
  fetchSupplierRfqDetail,
  submitSupplierQuotation,
} from "../services/supplierMetrics.js";

export function QuotationFormPage({ apiBase, getAccessToken }) {
  const [form] = Form.useForm();
  const [scope, setScope] = useState(null);
  const [rfqOptions, setRfqOptions] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRfq, setSelectedRfq] = useState(null);

  const loadRfqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ctx, rfqs] = await Promise.all([
        fetchSupplierContext({ apiBase, getAccessToken }),
        fetchSupplierRfqs({ apiBase, getAccessToken, limit: 100 }),
      ]);
      setScope(ctx);
      const open = (rfqs.data ?? []).filter((r) => r.status !== "Cancelled");
      setRfqOptions(open.map((r) => ({ value: r.name, label: `${r.name} — ${r.company ?? ""}` })));
    } catch (e) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAccessToken]);

  useEffect(() => { loadRfqs(); }, [loadRfqs]);

  const onRfqChange = async (rfqName) => {
    setSelectedRfq(rfqName);
    setLineItems([]);
    if (!rfqName) return;
    try {
      const res = await fetchSupplierRfqDetail(rfqName, { apiBase, getAccessToken });
      const items = (res.data?.items ?? []).map((row) => ({
        key: row.name,
        item_code: row.item_code,
        qty: row.qty,
        uom: row.uom,
        rate: row.rate ?? 0,
        rfq_item: row.name,
      }));
      setLineItems(items);
      form.setFieldsValue({ company: res.data?.company });
    } catch (e) {
      message.error(String(e?.message ?? e));
    }
  };

  const updateRate = (key, rate) => {
    setLineItems((prev) =>
      prev.map((row) => (row.key === key ? { ...row, rate } : row)),
    );
  };

  const onSubmit = async (values) => {
    if (!selectedRfq) {
      message.warning("Select an RFQ first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitSupplierQuotation(
        {
          request_for_quotation: selectedRfq,
          company: values.company,
          supplier: values.supplier,
          transaction_date: values.transaction_date,
          items: lineItems.map((row) => ({
            item_code: row.item_code,
            qty: row.qty,
            rate: row.rate,
            uom: row.uom,
            rfq_item: row.rfq_item,
          })),
        },
        { apiBase, getAccessToken },
      );
      message.success(`Supplier Quotation ${res.data?.name ?? "created"} submitted`);
      form.resetFields();
      setLineItems([]);
      setSelectedRfq(null);
    } catch (e) {
      message.error(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "Item", dataIndex: "item_code" },
    { title: "Qty", dataIndex: "qty", width: 90 },
    { title: "UOM", dataIndex: "uom", width: 80 },
    {
      title: "Rate",
      dataIndex: "rate",
      width: 120,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.rate}
          onChange={(v) => updateRate(row.key, v ?? 0)}
          style={{ width: "100%" }}
        />
      ),
    },
  ];

  return (
    <Card title="SUBMIT QUOTATION" loading={loading}>
      <Typography.Paragraph type="secondary" className="!mb-4">
        Create a Supplier Quotation against an open RFQ.
        {scope?.mode === "admin" ? " As admin, select the supplier for this quotation." : null}
        {scope?.supplier ? ` Linked supplier: ${scope.supplierName ?? scope.supplier}.` : null}
      </Typography.Paragraph>
      {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="request_for_quotation" label="RFQ" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Select RFQ"
            options={rfqOptions}
            onChange={onRfqChange}
          />
        </Form.Item>

        {scope?.mode === "admin" ? (
          <Form.Item name="supplier" label="Supplier" rules={[{ required: true }]}>
            <Input placeholder="Supplier ID (e.g. SUP-00001)" />
          </Form.Item>
        ) : null}

        <Form.Item name="company" label="Company">
          <Input placeholder="Company from RFQ" />
        </Form.Item>

        <Form.Item name="transaction_date" label="Quotation date" initialValue={new Date().toISOString().slice(0, 10)}>
          <Input type="date" />
        </Form.Item>

        <Typography.Title level={5} className="!mt-2">Line items</Typography.Title>
        <Table
          size="small"
          rowKey="key"
          dataSource={lineItems}
          columns={columns}
          pagination={false}
          locale={{ emptyText: "Select an RFQ to load items" }}
          className="mb-4"
        />

        <Space>
          <Button type="primary" htmlType="submit" loading={submitting} disabled={!lineItems.length}>
            Submit quotation
          </Button>
          <Button onClick={loadRfqs}>Refresh RFQs</Button>
        </Space>
      </Form>
    </Card>
  );
}
