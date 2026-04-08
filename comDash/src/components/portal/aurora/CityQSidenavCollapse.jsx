"use client";

import { IconButton, Tooltip } from "@mui/material";
import IconifyIcon from "components/base/IconifyIcon";
import { useSettingsContext } from "providers/SettingsProvider";

/**
 * Sidenav expand/collapse control without GSAP/MorphSVG (Aurora SidenavCollapse uses paid MorphSVGPlugin).
 */
export default function CityQSidenavCollapse() {
  const {
    config: { sidenavCollapsed, textDirection },
    toggleNavbarCollapse,
  } = useSettingsContext();
  const rtl = textDirection === "rtl";

  const icon = sidenavCollapsed
    ? rtl
      ? "material-symbols:chevron-left-rounded"
      : "material-symbols:chevron-right-rounded"
    : rtl
      ? "material-symbols:chevron-right-rounded"
      : "material-symbols:chevron-left-rounded";

  return (
    <Tooltip title={sidenavCollapsed ? "Expand" : "Collapse"} placement="right">
      <IconButton
        onClick={toggleNavbarCollapse}
        disableRipple
        aria-label={sidenavCollapsed ? "Expand navigation" : "Collapse navigation"}
        sx={{
          width: 40,
          flexShrink: 0,
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          right: -30,
          height: 80,
          borderRadius: 0,
          p: "0px !important",
        }}
      >
        <IconifyIcon icon={icon} sx={{ fontSize: 22 }} />
      </IconButton>
    </Tooltip>
  );
}
