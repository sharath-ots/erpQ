"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Table, Typography } from "antd";
import { fetchSupplierDocuments } from "../services/supplierMetrics.js";
import { getSupplierListViewConfig } from "../constants/supplierListViews.js";

const PAGE_SIZE = 20;

export function SupplierEntityList({ doctype, apiBase, getAccessToken, title, listFields }) {
  const cfg = getSupplierListViewConfig(doctype);
  const fields = listFields ?? cfg?.listFields ?? ["name", "modified"];
  const heading = title ?? cfg?.label ?? doctype;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scopeHint, setScopeHint] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = (page - 1) * PAGE_SIZE;
    try {
      const res = await fetchSupplierDocuments(doctype, {
        apiBase,
        getAccessToken,
        fields,
        limit: PAGE_SIZE,
        offset: start,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? (res.data ?? []).length);
      if (res.scope?.mode === "supplier" && res.scope.supplier) {
        setScopeHint(`Showing data for supplier ${res.scope.supplier}`);
      } else if (res.scope?.mode === "admin") {
        setScopeHint("Showing all records (admin view)");
      } else {
        setScopeHint(null);
      }
    } catch (e) {
      setError(String(e?.message ?? e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAccessToken, doctype, fields, page]);

  useEffect(() => { load(); }, [load]);

  const columns = fields.map((k) => ({
    title: k.replace(/_/g, " ").toUpperCase(),
    dataIndex: k,
    ellipsis: true,
  }));

  return (
    <Card title={heading.toUpperCase()}>
      {scopeHint ? (
        <Typography.Paragraph type="secondary" className="!mb-2">{scopeHint}</Typography.Paragraph>
      ) : null}
      <Typography.Paragraph type="secondary" className="!mb-3">
        DocType <Typography.Text code>{doctype}</Typography.Text>
      </Typography.Paragraph>
      {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
      <Table
        size="small"
        rowKey={(r) => r.name ?? JSON.stringify(r)}
        loading={loading}
        dataSource={rows}
        columns={columns.length ? columns : [{ title: "NAME", dataIndex: "name" }]}
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
