"use client";

import { Box, CircularProgress } from "@mui/material";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apigate";
import { findMenuItem } from "@/lib/menuMatch";
import MainLayout from "../../ui/layouts/main-layout/MainLayout";

export function PortalShellLayout({ children }) {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/v1/portal/menu");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMenuItems(data.items ?? []);
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

  // Look how clean this is now!
  return (
    <MainLayout>
      <Box sx={{ p: 0 }}>{children}</Box>
    </MainLayout>
  );
}