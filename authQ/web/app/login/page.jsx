"use client";

import { Button, Card, Divider, Form, Input, Space, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";

const erpSiteLabel = process.env.NEXT_PUBLIC_ERPNEXT_SITE_LABEL ?? "ERPNext";

/** When true: password optional (portal still needs a real JWT from apiGate — dummy tokens break /api/v1/portal/menu). */
const devBypass =
  process.env.NEXT_PUBLIC_LOGIN_DEV_BYPASS === "true" ||
  process.env.NEXT_PUBLIC_LOGIN_DEV_BYPASS === "1";

function guessBase(port) {
  if (typeof window === "undefined") return "";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function trimTrailingSlash(url) {
  return (url ?? "").replace(/\/$/, "");
}

/** Build-time NEXT_PUBLIC_* often still points at an old LAN host that the browser cannot resolve. */
function bakedPointsAtErpqLan(url) {
  if (!url || typeof url !== "string") return false;
  try {
    return new URL(url).hostname === "erpq.lan";
  } catch {
    return false;
  }
}

/** Injected in root layout from AUTH_WEB_RUNTIME_* (Docker) — overrides baked NEXT_PUBLIC_*. */
function getRuntimePublic() {
  if (typeof window === "undefined") return null;
  const w = window.__AUTH_WEB_PUBLIC__;
  if (!w || typeof w !== "object") return null;
  return w;
}

/** Prefer explicit URL; never use erpq.lan in the browser (DNS); else same-host :port guess. */
function resolvePublicBase(port, runtimeVal, bakedVal) {
  const fromRt = runtimeVal && String(runtimeVal).trim();
  if (fromRt && !bakedPointsAtErpqLan(fromRt)) return trimTrailingSlash(fromRt);
  const baked = bakedVal && String(bakedVal).trim();
  if (baked && !bakedPointsAtErpqLan(baked)) return trimTrailingSlash(baked);
  return trimTrailingSlash(guessBase(port));
}

function getApiBase() {
  const rt = getRuntimePublic();
  return resolvePublicBase(18080, rt?.apigate, process.env.NEXT_PUBLIC_APIGATE_URL);
}

function getAuthQBase() {
  const rt = getRuntimePublic();
  return resolvePublicBase(14100, rt?.authq, process.env.NEXT_PUBLIC_AUTHQ_URL);
}

function getComDashBase() {
  const rt = getRuntimePublic();
  return resolvePublicBase(13001, rt?.comdash, process.env.NEXT_PUBLIC_COMDASH_URL);
}

function Brand() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm" />
      <div className="leading-tight">
        <div className="text-base font-semibold text-slate-900">Q-Portal</div>
        <div className="text-[11px] text-slate-500 -mt-0.5">Sign in</div>
      </div>
    </div>
  );
}

function IllustrationPanel() {
  return (
    <div className="relative hidden lg:flex h-full w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-indigo-50 p-10">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />

      <div className="relative mt-8 w-full">
        <Typography.Title level={2} className="!mb-3 !text-slate-900">
          Welcome back
        </Typography.Title>
        <Typography.Paragraph className="!mb-10 !text-slate-600 max-w-md">
          Sign in to continue to the Q portal. Use your {erpSiteLabel} credentials or SSO.
        </Typography.Paragraph>

        {/* Lightweight inline illustration (no external assets) */}
        <div className="w-full max-w-xl">
          <svg viewBox="0 0 820 420" className="w-full h-auto">
            <defs>
              <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#A5B4FC" />
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>
            </defs>
            <rect x="80" y="170" width="540" height="120" rx="60" fill="url(#g1)" opacity="0.9" />
            <rect x="140" y="130" width="520" height="120" rx="60" fill="url(#g2)" opacity="0.55" />

            <g transform="translate(150,210)">
              <circle cx="60" cy="60" r="44" fill="#E0F2FE" />
              <circle cx="60" cy="52" r="10" fill="#0F172A" opacity="0.6" />
              <rect x="35" y="68" width="50" height="36" rx="18" fill="#0F172A" opacity="0.12" />
            </g>
            <g transform="translate(300,200)">
              <circle cx="60" cy="60" r="44" fill="#E0E7FF" />
              <circle cx="60" cy="52" r="10" fill="#0F172A" opacity="0.6" />
              <rect x="35" y="68" width="50" height="36" rx="18" fill="#0F172A" opacity="0.12" />
            </g>
            <g transform="translate(450,210)">
              <circle cx="60" cy="60" r="44" fill="#D1FAE5" />
              <circle cx="60" cy="52" r="10" fill="#0F172A" opacity="0.6" />
              <rect x="35" y="68" width="50" height="36" rx="18" fill="#0F172A" opacity="0.12" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

function SsoButton({ href, provider }) {
  const label = provider === "google" ? "Sign in with Google" : "Sign in with Zoho";
  const badge =
    provider === "google" ? (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-900/90 text-slate-700 text-xs font-semibold">
        G
      </span>
    ) : (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-900/90 text-slate-700 text-xs font-semibold">
        Z
      </span>
    );

  return (
    <Button
      block
      size="large"
      href={href}
      className="!h-11 !rounded-xl !bg-slate-900 !text-white hover:!bg-slate-800"
      icon={badge}
    >
      {label}
    </Button>
  );
}

function LoginCard() {
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirect(params.get("redirect") ?? "/");
  }, []);

  const oauthReturn = useMemo(() => encodeURIComponent(`${getComDashBase()}/`), []);
  const googleHref = `${getAuthQBase()}/oauth/google/start?return_url=${oauthReturn}`;
  const zohoHref = `${getAuthQBase()}/oauth/zoho/start?return_url=${oauthReturn}`;

  async function onFinish(values) {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("redirect") ?? getComDashBase();
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

      const data = (await res.json().catch(() => ({}))) ?? {};

      if (!res.ok) {
        message.error(data.detail ?? data.error ?? `Login failed (${res.status})`);
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
    <Card className="w-full max-w-md shadow-lg !rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <Typography.Title level={2} className="!mb-0">
          Log in
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs">
          Need help? Contact admin
        </Typography.Text>
      </div>

      <Space direction="vertical" className="w-full" size="middle">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SsoButton href={googleHref} provider="google" />
          <SsoButton href={zohoHref} provider="zoho" />
        </div>

        <Divider plain className="!my-2">
          or use email
        </Divider>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            label="Email / ERPNext username"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input type="text" autoComplete="username" className="!h-11 !rounded-xl" />
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
            <Input.Password autoComplete="current-password" className="!h-11 !rounded-xl" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            className="!h-11 !rounded-xl"
          >
            Continue
          </Button>
        </Form>
      </Space>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Brand />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="grid min-h-[calc(100vh-96px)] grid-cols-1 gap-8 lg:grid-cols-2">
          <IllustrationPanel />
          <div className="flex items-center justify-center lg:justify-end">
            <LoginCard />
          </div>
        </div>
      </div>
    </div>
  );
}

