"use client";

import { ConfigProvider } from "antd";

/**
 * Ant Design token values aligned with the vendored shared UI palette.
 */
const sharedUiToken = {
  colorPrimary: "#3385F0",
  colorSuccess: "#099F69",
  colorWarning: "#F68D2A",
  colorError: "#D02241",
  colorInfo: "#0DA6D6",
  borderRadius: 8,
};

export function SharedUiTokensProvider({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: sharedUiToken,
        /** Explicitly disable CSS-variable token mode (antd 5.12+). Newer 5.29.x builds
         *  can hit Object.keys(undefined) in the css-in-js token hasher when this is left implicit. */
        cssVar: false,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
