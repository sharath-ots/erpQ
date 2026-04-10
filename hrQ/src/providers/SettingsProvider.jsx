"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

const SettingsContext = createContext({
  getThemeColor: (v) => v,
  config: { assetsDir: "" },
});

export function SettingsProvider({ children }) {
  const getThemeColor = useCallback((value) => value, []);
  const value = useMemo(
    () => ({ getThemeColor, config: { assetsDir: "" } }),
    [getThemeColor],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}
