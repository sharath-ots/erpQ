"use client";

import { ConfigProvider } from "antd";

/**
 * Ant Design token values aligned with Aurora template palette
 * (`comDash/docs/aurora/src/theme/colors/base.js` — primary blue 500, etc.).
 */
const auroraToken = {
  colorPrimary: "#3385F0",
  colorSuccess: "#099F69",
  colorWarning: "#F68D2A",
  colorError: "#D02241",
  colorInfo: "#0DA6D6",
  borderRadius: 8,
};

export function AuroraTokensProvider({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: auroraToken,
        /** Explicitly disable CSS-variable token mode (antd 5.12+). Newer 5.29.x builds
         *  can hit Object.keys(undefined) in the css-in-js token hasher when this is left implicit. */
        cssVar: false,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
