"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Table, Typography } from "antd";
import { fetchSupplierRfqs } from "../services/supplierMetrics.js";

const PAGE_SIZE = 20;

/** Dedicated RFQ list using /api/v1/supplierq/rfqs */
export function RfqListPage({ apiBase, getAccessToken }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const res = await fetchSupplierRfqs({
        apiBase,
        getAccessToken,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? (res.data ?? []).length);
    } catch (e) {
      setError(String(e?.message ?? e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAccessToken, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "RFQ", dataIndex: "name", ellipsis: true },
    { title: "date", dataIndex: "transaction_date", ellipsis: true },
    { title: "required by", dataIndex: "schedule_date", ellipsis: true },
    { title: "status", dataIndex: "status", ellipsis: true },
    { title: "company", dataIndex: "company", ellipsis: true },
    { title: "modified", dataIndex: "modified", ellipsis: true },
  ];

  return (
    <Card title="RFQ">
      <Typography.Paragraph type="secondary" className="!mb-3">
        Open RFQs from ERPNext — submit your quotation from the Supplier Quotation screen.
      </Typography.Paragraph>
      {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
      <Table
        size="small"
        rowKey={(r) => r.name ?? JSON.stringify(r)}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );
}
