"use client";

import { Box, CircularProgress } from "@mui/material";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ModuleOutlet } from "./ModuleOutlet";
import { apiFetch } from "@/lib/apigate";
import { findMenuItem } from "@/lib/menuMatch";
import MainLayout from "../../ui/layouts/main-layout/MainLayout";

export function PortalShell() {
  const pathname = usePathname();
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
        }
      } catch {
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box className="flex min-h-screen items-center justify-center" sx={{ bgcolor: "background.default" }}>
        <CircularProgress aria-label="Loading portal" />
      </Box>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <ModuleOutlet
          menuItems={menuItems}
          deskBaseUrl={deskBaseUrl}
          deskIframeQuery={deskIframeQuery}
        />
      </Box>
    </MainLayout>
  );
}