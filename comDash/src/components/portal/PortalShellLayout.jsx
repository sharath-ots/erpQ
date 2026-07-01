"use client";

import Box from "@mui/material/Box";
import { PortalMenuProvider } from "./PortalMenuProvider";
import MainLayout from "../../ui/layouts/main-layout/MainLayout";

export function PortalShellLayout({ children }) {
  return (
    <PortalMenuProvider>
      <MainLayout>
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </MainLayout>
    </PortalMenuProvider>
  );
}