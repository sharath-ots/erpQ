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
      // Fetch auth URL from server at runtime — avoids baking localhost:3100
      // into the JS bundle when building inside Docker.
      let authUrl =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3100`
          : "";
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.authUrl) authUrl = cfg.authUrl;
        }
      } catch {
        // fall through to default
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
