"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { PortalRootShell } from "./shared-ui/PortalRootShell";
import { SharedUiTokensProvider } from "@/components/providers/SharedUiTokensProvider";

/** Single client boundary for Ant Design + MUI theme shell (avoids fragmented RSC→client edges). */
export function PortalClientRoot({ children }) {
  return (
    <AntdRegistry>
      <PortalRootShell>
        <SharedUiTokensProvider>{children}</SharedUiTokensProvider>
      </PortalRootShell>
    </AntdRegistry>
  );
}
