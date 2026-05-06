"use client";

import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { isTokenExpired, redirectToLogin } from "@/lib/apigate";

/** Dev / cross-origin login: token arrives in hash (localStorage is per-origin; 3100 ≠ 13000). */
function consumeTokenFromHash() {
  if (typeof window === "undefined") return null;
  const { hash } = window.location;
  if (!hash?.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const raw = params.get("cityq_token");
  if (!raw) return null;
  const token = decodeURIComponent(raw);
  window.localStorage.setItem("cityq_access_token", token);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  return token;
}

export function AuthGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      // Prefer NEXT_PUBLIC_AUTH_URL from build/runtime; else match /api/config logic.
      let authUrl = (process.env.NEXT_PUBLIC_AUTH_URL || "")
        .replace(/\/$/, "")
        .replace(/\/login$/, "");
      if (!authUrl) {
        const port = window.location.port;
        const usePathLogin = !port || port === "80" || port === "443";
        authUrl = usePathLogin
          ? window.location.origin
          : `${window.location.protocol}//${window.location.hostname}:3100`;
      }

      let token = consumeTokenFromHash();
      if (!token) {
        token = window.localStorage.getItem("cityq_access_token");
      }

      if (!token || isTokenExpired(token)) {
        const here = `${window.location.origin}${window.location.pathname}`;
        window.location.href = `${authUrl.replace(/\/$/, "")}/login?redirect=${encodeURIComponent(here)}`;
        return;
      }

      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
