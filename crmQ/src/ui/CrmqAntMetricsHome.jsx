"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Typography,
} from "antd";
import { ErpNextGatewayClient } from "../api/gatewayErpNextClient.js";
import { deskQuickLinks } from "../utils/deskUrl.js";
import { fetchCrmMetrics } from "../services/crmMetrics.js";

/**
 * Legacy Ant Design CRM home: apiGate metrics + ERPNext quick links.
 * Not used for `/m/crmq` home — kept if you want to embed it elsewhere.
 */
export function CrmqAntMetricsHome({ deskBaseUrl, apiBase, getAccessToken }) {
  const client = useMemo(
    () =>
      new ErpNextGatewayClient({
        baseUrl: apiBase,
        getAccessToken,
      }),
    [apiBase, getAccessToken],
  );

  const [metrics, setMetrics] = useState({
    leadCount: null,
    opportunityCount: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const m = await fetchCrmMetrics(client);
      if (!cancelled) {
        setMetrics(m);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const links = deskQuickLinks(deskBaseUrl);

  return (
    <div className="space-y-4">
      <div>
        <Typography.Title level={3} className="!mb-1">
          CRM dashboard
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0">
          CRM lists run <strong>inside this portal</strong> via apiGate (no desk iframe). Use{" "}
          <strong>Other doctypes</strong> in the sidebar only for DocTypes not listed here. Open
          full ERPNext in a new tab if you still need the classic desk.
        </Typography.Paragraph>
      </div>

      {metrics.error ? (
        <Alert
          type="warning"
          showIcon
          message="Could not load live counts"
          description={metrics.error}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Leads (approx.)"
              value={metrics.leadCount ?? "—"}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Opportunities (approx.)"
              value={metrics.opportunityCount ?? "—"}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card title="ERPNext (cityqerp)">
            {!deskBaseUrl ? (
              <Typography.Text type="secondary">
                Set <Typography.Text code>ERPNEXT_URL</Typography.Text> or{" "}
                <Typography.Text code>ERPNEXT_PUBLIC_URL</Typography.Text> on
                apiGate so the portal can link to your desk.
              </Typography.Text>
            ) : (
              <Space wrap>
                {links.map((l) => (
                  <Button
                    key={l.key}
                    type="link"
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.label}
                  </Button>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
