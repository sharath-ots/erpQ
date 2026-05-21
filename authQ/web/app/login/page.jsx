"use client";

import { useEffect, useMemo, useState } from "react";

const erpSiteLabel = process.env.NEXT_PUBLIC_ERPNEXT_SITE_LABEL ?? "ERPNext";

/** When true: password optional (portal still needs a real JWT from apiGate). */
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

function getRuntimePublic() {
  if (typeof window === "undefined") return null;
  const w = window.__AUTH_WEB_PUBLIC__;
  if (!w || typeof w !== "object") return null;
  return w;
}

function resolvePublicBase(port, runtimeVal, bakedVal) {
  const fromRt = runtimeVal && String(runtimeVal).trim();
  if (fromRt) return trimTrailingSlash(fromRt);
  const baked = bakedVal && String(bakedVal).trim();
  if (baked) return trimTrailingSlash(baked);
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

function isLoginUrl(url) {
  return url.pathname === "/login" || url.pathname.startsWith("/login/");
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
        <h2 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back
        </h2>
        <p className="mb-10 max-w-md text-base text-slate-600">
          Sign in to continue to the Q portal. Use your {erpSiteLabel} credentials or SSO.
        </p>

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

  return (
    <a
      href={href}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
        {provider === "google" ? "G" : "Z"}
      </span>
      {label}
    </a>
  );
}

function LoginCard() {
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState("/");
  const [error, setError] = useState("");
  const [errorPopup, setErrorPopup] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirect(params.get("redirect") ?? "/");
  }, []);

  const oauthReturn = useMemo(() => encodeURIComponent(`${getComDashBase()}/`), []);
  const googleHref = `${getAuthQBase()}/oauth/google/start?return_url=${oauthReturn}`;
  const zohoHref = `${getAuthQBase()}/oauth/zoho/start?return_url=${oauthReturn}`;

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setErrorPopup(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("redirect") ?? getComDashBase();
      const dest = new URL(
        target,
        typeof window !== "undefined" ? window.location.href : undefined,
      );
      if (isLoginUrl(dest)) {
        const fallback = new URL(getComDashBase());
        dest.protocol = fallback.protocol;
        dest.host = fallback.host;
        dest.pathname = fallback.pathname || "/";
        dest.search = fallback.search;
      }

      const res = await fetch(`${getApiBase()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password: devBypass && !password.trim() ? "" : password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.access_token) {
        let cleanMessage = "Incorrect email or password. Please try again.";
        if (res.status >= 500) {
          cleanMessage = "The server encountered an error. Please try again later.";
        } else if (data.detail && typeof data.detail === "string" && !data.detail.includes("Frappe")) {
          cleanMessage = data.detail;
        } else if (data.error && typeof data.error === "string") {
          cleanMessage = data.error;
        }
        setErrorPopup(cleanMessage);
        setError(cleanMessage);
        return;
      }

      dest.hash = `cityq_token=${encodeURIComponent(data.access_token)}`;
      window.location.href = dest.toString();
    } catch (err) {
      const msg = "Could not connect to the server. Please check your connection.";
      setErrorPopup(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Log in
          </h2>
          <p className="text-xs text-slate-500">
            Need help? Contact admin
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SsoButton href={googleHref} provider="google" />
          <SsoButton href={zohoHref} provider="zoho" />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            or use email
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Email / ERPNext username
            </span>
            <input
              name="email"
              type="text"
              autoComplete="username"
              required
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required={!devBypass}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>

      {errorPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Authentication failed</h3>
            <p className="mt-2 text-sm text-red-600">{errorPopup}</p>
            <button
              type="button"
              className="mt-4 h-10 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
              onClick={() => setErrorPopup(null)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white">
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
