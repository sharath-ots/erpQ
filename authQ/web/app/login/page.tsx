"use client";

import { Button, Card, Divider, Form, Input, Space, Typography, message } from "antd";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

const erpSiteLabel =
  process.env.NEXT_PUBLIC_ERPNEXT_SITE_LABEL ?? "ERPNext";

/** When true: password optional (portal still needs a real JWT from apiGate — dummy tokens break /api/v1/portal/menu). */
const devBypass =
  process.env.NEXT_PUBLIC_LOGIN_DEV_BYPASS === "true" ||
  process.env.NEXT_PUBLIC_LOGIN_DEV_BYPASS === "1";

function guessBase(port: number) {
  if (typeof window === "undefined") return "";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function getApiBase() {
  return (process.env.NEXT_PUBLIC_APIGATE_URL || guessBase(18080)).replace(/\/$/, "");
}

function getAuthQBase() {
  return (process.env.NEXT_PUBLIC_AUTHQ_URL || guessBase(14100)).replace(/\/$/, "");
}

function getComDashBase() {
  return (process.env.NEXT_PUBLIC_COMDASH_URL || guessBase(13000)).replace(/\/$/, "");
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const oauthReturn = encodeURIComponent(`${getComDashBase()}/`);

  async function onFinish(values: { email: string; password?: string }) {
    setLoading(true);
    try {
      const target = searchParams.get("redirect") ?? getComDashBase();
      const dest = new URL(
        target,
        typeof window !== "undefined" ? window.location.href : undefined,
      );

      const res = await fetch(`${getApiBase()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: values.email,
          password:
            devBypass && !(values.password ?? "").trim()
              ? ""
              : (values.password ?? ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        access_token?: string;
      };
      if (!res.ok) {
        message.error(
          data.detail ?? data.error ?? `Login failed (${res.status})`,
        );
        return;
      }
      const token = data.access_token;
      if (!token) {
        message.error("No access token from apiGate");
        return;
      }
      dest.hash = `cityq_token=${encodeURIComponent(token)}`;
      window.location.href = dest.toString();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md w-full shadow-lg">
      <Typography.Title level={3} className="!mb-6 text-center">
        CityQ — Sign in
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="text-center">
        {devBypass
          ? "Dev mode: password optional when apiGate has no ERPNEXT_URL; with ERPNext configured, use real credentials."
          : `Use the same username and password as ${erpSiteLabel} — apiGate checks them against Frappe /api/method/login, then authQ issues your portal token.`}
        {redirect !== "/" ? (
          <>
            <br />
            After login → {redirect}
          </>
        ) : null}
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email / ERPNext username"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input type="text" autoComplete="username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: !devBypass,
              message: devBypass ? "" : "Required for ERPNext login",
            },
          ]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Continue
        </Button>
      </Form>
      <Divider plain>or</Divider>
      <Space direction="vertical" className="w-full" size="middle">
        <Typography.Text type="secondary" className="block text-center text-xs">
          OAuth redirects to authQ, then back to the dashboard with a token in the URL hash
          (same as ERP password login).
        </Typography.Text>
        <Button
          block
          size="large"
          href={`${getAuthQBase()}/oauth/google/start?return_url=${oauthReturn}`}
        >
          Continue with Google
        </Button>
        <Button
          block
          size="large"
          href={`${getAuthQBase()}/oauth/zoho/start?return_url=${oauthReturn}`}
        >
          Continue with Zoho
        </Button>
      </Space>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<Card loading className="max-w-md w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
