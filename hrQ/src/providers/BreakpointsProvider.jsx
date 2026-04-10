"use client";

import { createContext, useContext } from "react";

const BreakpointsContext = createContext({ up: () => true, down: () => false });

export function BreakpointsProvider({ children }) {
  return (
    <BreakpointsContext.Provider value={{ up: () => true, down: () => false }}>
      {children}
    </BreakpointsContext.Provider>
  );
}

export function useBreakpoints() {
  return useContext(BreakpointsContext);
}
