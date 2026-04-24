"use client";

import { Icon } from "@iconify/react";
import { useId } from "react";
import Box from "@mui/material/Box";
import { registerIcons } from "lib/iconify/iconify-register";

/**
 * Icon component bridge.
 * We register bundled icon datasets to avoid missing icons/flicker in production builds.
 */
export const IconifyIcon = ({ icon, flipOnRTL = false, color, sx, ...rest }) => {
  const uniqueId = useId();
  registerIcons();
  const iconNameClass = icon.split(":").join("-");
  return (
    <Box
      component={Icon}
      className={`iconify ${iconNameClass}`}
      sx={[
        flipOnRTL && {
          transform: (theme) => (theme.direction === "rtl" ? "scaleX(-1)" : "none"),
        },
        { verticalAlign: "baseline" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
      icon={icon}
      id={uniqueId}
      color={color}
      ssr
    />
  );
};

export default IconifyIcon;
