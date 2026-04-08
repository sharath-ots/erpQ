"use client";

import { Icon } from "@iconify/react";
import Box from "@mui/material/Box";

/**
 * Simplified IconifyIcon bridge.
 * Aurora's version imports iconify-register which pre-loads icon collections.
 * The portal only uses online-resolved icons (material-symbols:*), so registration isn't needed.
 */
export const IconifyIcon = ({ icon, flipOnRTL = false, color, sx, ...rest }) => {
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
      color={color}
    />
  );
};

export default IconifyIcon;
