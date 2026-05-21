"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";

export default function DocDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(
          "/api/v1/partners/workdrive/api/v1/docs/dashboard/summary",
        );
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
        }
        const json = await res.json();
        if (alive) setSummary(json);
      } catch (e) {
        if (alive) setError(String(e?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card
      title="Documents"
      loading={loading}
      extra={
        error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : null
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="My drafts" value={summary?.myDrafts ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="By state">
            {(summary?.byState || []).map((r) => (
              <Typography.Paragraph key={r.state} style={{ marginBottom: 8 }}>
                <Typography.Text strong>{r.state}</Typography.Text>: {r.count}
              </Typography.Paragraph>
            ))}
            {!summary?.byState?.length && (
              <Typography.Text type="secondary">No documents registered yet.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
}

