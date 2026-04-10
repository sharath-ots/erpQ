"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

const SettingsContext = createContext({
  getThemeColor: (v) => v,
});

export function SettingsProvider({ children }) {
  const getThemeColor = useCallback((value) => value, []);
  const value = useMemo(() => ({ getThemeColor }), [getThemeColor]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}

