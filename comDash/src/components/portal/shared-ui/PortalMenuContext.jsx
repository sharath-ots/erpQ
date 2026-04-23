"use client";

import { createContext, useContext } from "react";

const PortalMenuContext = createContext({
  menuItems: [],
  email: undefined,
  deskBaseUrl: null,
  deskIframeQuery: null,
  selectedKey: undefined,
});

export function PortalMenuProvider({ value, children }) {
  return (
    <PortalMenuContext.Provider value={value}>{children}</PortalMenuContext.Provider>
  );
}

export function usePortalMenu() {
  return useContext(PortalMenuContext);
}
