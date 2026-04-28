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
      // Derive auth-web URL from current origin.
      // - Local (ports): http://localhost:13000 -> http://localhost:3100
      // - Traefik (path): https://erpq.lan -> https://erpq.lan/login
      let authUrl = `${window.location.protocol}//${window.location.hostname}:3100`;
      if (window.location.port === "" || window.location.port === "80" || window.location.port === "443") {
        authUrl = `${window.location.origin}/login`;
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
