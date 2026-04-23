"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@mui/material";

const ORDER = ["xs", "sm", "md", "lg", "xl"];

export const BreakpointContext = createContext({
  currentBreakpoint: "xs",
  up: () => true,
  down: () => false,
  only: () => false,
  between: () => false,
});

function BreakpointsProvider({ children }) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState("xs");

  const isXs = useMediaQuery((theme) => theme.breakpoints.between("xs", "sm"));
  const isSm = useMediaQuery((theme) => theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery((theme) => theme.breakpoints.between("md", "lg"));
  const isLg = useMediaQuery((theme) => theme.breakpoints.between("lg", "xl"));
  const isXl = useMediaQuery((theme) => theme.breakpoints.up("xl"));

  useEffect(() => {
    if (isXl) return setCurrentBreakpoint("xl");
    if (isLg) return setCurrentBreakpoint("lg");
    if (isMd) return setCurrentBreakpoint("md");
    if (isSm) return setCurrentBreakpoint("sm");
    if (isXs) return setCurrentBreakpoint("xs");
    return undefined;
  }, [isXs, isSm, isMd, isLg, isXl]);

  const helpers = useMemo(() => {
    const idx = ORDER.indexOf(currentBreakpoint);
    const norm = (k) => ORDER.indexOf(k);
    return {
      up: (k) => idx >= norm(k),
      down: (k) => idx <= norm(k),
      only: (k) => idx === norm(k),
      between: (start, end) => idx >= norm(start) && idx <= norm(end),
    };
  }, [currentBreakpoint]);

  return (
    <BreakpointContext.Provider value={{ currentBreakpoint, ...helpers }}>
      {children}
    </BreakpointContext.Provider>
  );
}

export const useBreakpoints = () => useContext(BreakpointContext);

export default BreakpointsProvider;
