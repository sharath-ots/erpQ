"use client";

import { Box, CircularProgress } from "@mui/material";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { findMenuItem } from "@/lib/menuMatch";
import MainLayoutCityQ from "./aurora/MainLayoutCityQ";
import { PortalMenuProvider } from "./aurora/PortalMenuContext";

/**
 * Persistent shell: fetches the portal menu once, then renders MainLayoutCityQ
 * (sidebar + topbar) with {children} as the content slot.
 *
 * Lives in a Next.js route-group layout so it is never unmounted during
 * client-side navigation — only the page content slot re-renders.
 */
export function PortalShellLayout({ children }) {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState([]);
  const [deskBaseUrl, setDeskBaseUrl] = useState(null);
  const [deskIframeQuery, setDeskIframeQuery] = useState(null);
  const [email, setEmail] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/v1/portal/menu");
        if (!res.ok) {
          if (!cancelled) setMenuItems([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMenuItems(data.items ?? []);
          setDeskBaseUrl(data.deskBaseUrl ?? null);
          setDeskIframeQuery(data.deskIframeQuery ?? null);
          setEmail(data.email);
        }
      } catch {
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // fetch once on mount — layout never unmounts during navigation

  const selectedKey = useMemo(() => {
    const hit = findMenuItem(menuItems, pathname);
    return hit?.key ?? hit?.path ?? "/";
  }, [pathname, menuItems]);

  if (loading) {
    return (
      <Box
        className="flex min-h-screen items-center justify-center"
        sx={{ bgcolor: "background.default" }}
      >
        <CircularProgress aria-label="Loading portal" />
      </Box>
    );
  }

  return (
    <PortalMenuProvider
      value={{ menuItems, email, deskBaseUrl, deskIframeQuery, selectedKey }}
    >
      <MainLayoutCityQ>
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </MainLayoutCityQ>
    </PortalMenuProvider>
  );
}
