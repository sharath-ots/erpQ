"use client";

import { Box, ButtonBase, Typography } from "@mui/material";

/** Aurora-style clickable legend chip (label / color / active). */
export default function ChartLegend({ label, color, handleClick, isActive, symbol, sx }) {
  return (
    <ButtonBase
      disableRipple
      sx={{
        opacity: isActive ? 0.5 : 1,
        gap: 1,
        ...sx,
      }}
      onClick={handleClick}
    >
      {symbol ?? (
        <Box
          sx={{
            width: 8,
            height: 6,
            bgcolor: color || "primary.main",
            borderRadius: 0.25,
          }}
        />
      )}

      <Typography variant="caption" noWrap sx={{ color: "text.secondary", fontWeight: 500 }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}
