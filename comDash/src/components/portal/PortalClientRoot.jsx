"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuroraRootShell } from "./aurora/AuroraRootShell";
import { AuroraTokensProvider } from "@/components/providers/AuroraTokensProvider";

/** Single client boundary for Ant Design + Aurora/MUI (avoids fragmented RSC→client edges). */
export function PortalClientRoot({ children }) {
  return (
    <AntdRegistry>
      <AuroraRootShell>
        <AuroraTokensProvider>{children}</AuroraTokensProvider>
      </AuroraRootShell>
    </AntdRegistry>
  );
}
