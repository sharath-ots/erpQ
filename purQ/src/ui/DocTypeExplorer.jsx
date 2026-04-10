"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { ErpNextGatewayClient, GatewayErpNextError } from "../api/gatewayErpNextClient.js";

/**
 * Generic DocType list explorer (uses portal JWT via apiGate).
 */
export function DocTypeExplorer({ apiBase, getAccessToken }) {
  const client = useMemo(
    () =>
      new ErpNextGatewayClient({
        baseUrl: apiBase,
        getAccessToken,
      }),
    [apiBase, getAccessToken],
  );

  const [doctypes, setDoctypes] = useState([]);
  const [doctype, setDoctype] = useState("Lead");
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDocTypes = useCallback(async () => {
    setError(null);
    try {
      const res = await client.listDocTypes({ limit_page_length: 300 });
      setDoctypes(res.data ?? []);
    } catch (e) {
      const msg =
        e instanceof GatewayErpNextError
          ? `${e.message} (${e.status})`
          : String(e);
      setError(msg);
    }
  }, [client]);

  useEffect(() => {
    loadDocTypes();
  }, [loadDocTypes]);

  const loadRows = async () => {
    if (!doctype) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        client.listDocuments(doctype, {
          limit_page_length: 25,
          fields: JSON.stringify(["name", "modified"]),
        }),
        client.countDocuments(doctype).catch(() => ({ data: null })),
      ]);
      setRows(listRes.data ?? []);
      setCount(
        countRes?.data !== undefined && countRes?.data !== null
          ? countRes.data
          : null,
      );
    } catch (e) {
      setError(e instanceof GatewayErpNextError ? e.message : String(e));
      setRows([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Generic DocType list" className="mt-4">
      <Typography.Paragraph type="secondary" className="!mb-3">
        Pick any allowed DocType and load rows via apiGate{" "}
        <Typography.Text code>/api/v1/partners/erpnext</Typography.Text>. Prefer curated
        sidebar entries for standard purchasing objects.
      </Typography.Paragraph>
      {error ? (
        <Alert type="error" message={error} className="mb-4" showIcon />
      ) : null}
      <Space wrap className="mb-4">
        <Select
          showSearch
          style={{ minWidth: 220 }}
          placeholder="DocType"
          value={doctype}
          onChange={setDoctype}
          options={doctypes.map((d) => ({
            value: d.name,
            label: `${d.name} (${d.module || "?"})`,
          }))}
        />
        <Button type="primary" onClick={loadRows} loading={loading}>
          Load rows
        </Button>
        <Button onClick={loadDocTypes}>Refresh DocTypes</Button>
      </Space>
      {count !== null ? (
        <Typography.Text type="secondary" className="block mb-2">
          Count: {String(count)}
        </Typography.Text>
      ) : null}
      <Table
        size="small"
        rowKey={(r) => r.name ?? JSON.stringify(r)}
        loading={loading}
        dataSource={rows}
        columns={
          rows.length
            ? Object.keys(rows[0]).map((k) => ({
                title: k,
                dataIndex: k,
                ellipsis: true,
              }))
            : [
                { title: "name", dataIndex: "name" },
                { title: "modified", dataIndex: "modified" },
              ]
        }
        pagination={false}
      />
    </Card>
  );
}

