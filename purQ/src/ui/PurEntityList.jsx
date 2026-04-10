"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, Table, Typography } from "antd";
import { ErpNextGatewayClient, GatewayErpNextError } from "../api/gatewayErpNextClient.js";
import { getPurListViewConfig } from "../constants/purListViews.js";

const PAGE_SIZE = 20;

export function PurEntityList({ doctype, apiBase, getAccessToken, title, listFields }) {
  const client = useMemo(
    () => new ErpNextGatewayClient({ baseUrl: apiBase, getAccessToken }),
    [apiBase, getAccessToken],
  );

  const cfg = getPurListViewConfig(doctype);
  const fields = listFields ?? cfg?.listFields ?? ["name", "modified"];
  const heading = title ?? cfg?.label ?? doctype;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = (page - 1) * PAGE_SIZE;
    try {
      const [listRes, countRes] = await Promise.all([
        client.listDocuments(doctype, {
          fields: JSON.stringify(fields),
          limit_start: start,
          limit_page_length: PAGE_SIZE,
          order_by: "modified desc",
        }),
        client.countDocuments(doctype).catch(() => ({ data: null })),
      ]);
      setRows(listRes.data ?? []);
      setTotal(typeof countRes?.data === "number" ? countRes.data : (listRes.data ?? []).length);
    } catch (e) {
      setError(e instanceof GatewayErpNextError ? e.message : String(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [client, doctype, fields, page]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => {
    const keys = rows.length > 0 ? fields.filter((f) => f in rows[0]) : fields;
    return keys.map((k) => ({ title: k.replace(/_/g, " "), dataIndex: k, ellipsis: true }));
  }, [rows, fields]);

  return (
    <Card title={heading}>
      <Typography.Paragraph type="secondary" className="!mb-3">
        DocType <Typography.Text code>{doctype}</Typography.Text> — data via apiGate.
      </Typography.Paragraph>
      {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
      <Table
        size="small"
        rowKey={(r) => r.name ?? JSON.stringify(r)}
        loading={loading}
        dataSource={rows}
        columns={columns.length ? columns : [{ title: "name", dataIndex: "name" }]}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, onChange: (p) => setPage(p) }}
      />
    </Card>
  );
}
