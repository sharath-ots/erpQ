"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { PortalRootShell } from "./aurora/PortalRootShell";
import { AuroraTokensProvider } from "@/components/providers/AuroraTokensProvider";

/** Single client boundary for Ant Design + MUI theme shell (avoids fragmented RSC→client edges). */
export function PortalClientRoot({ children }) {
  return (
    <AntdRegistry>
      <PortalRootShell>
        <AuroraTokensProvider>{children}</AuroraTokensProvider>
      </PortalRootShell>
    </AntdRegistry>
  );
}
