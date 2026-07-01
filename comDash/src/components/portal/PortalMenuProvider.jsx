"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apigate";

const PortalMenuContext = createContext({
  menuItems: [],
  deskBaseUrl: null,
  deskIframeQuery: null,
  loading: true,
});

export function usePortalMenu() {
  return useContext(PortalMenuContext);
}

export function PortalMenuProvider({ children }) {
  const [menuItems, setMenuItems] = useState([]);
  const [deskBaseUrl, setDeskBaseUrl] = useState(null);
  const [deskIframeQuery, setDeskIframeQuery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/v1/portal/menu");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setMenuItems(data.items ?? []);
            setDeskBaseUrl(data.deskBaseUrl ?? null);
            setDeskIframeQuery(data.deskIframeQuery ?? null);
          }
        } else if (!cancelled) {
          setMenuItems([]);
        }
      } catch {
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <PortalMenuContext.Provider
      value={{ menuItems, deskBaseUrl, deskIframeQuery, loading }}
    >
      {children}
    </PortalMenuContext.Provider>
  );
}
