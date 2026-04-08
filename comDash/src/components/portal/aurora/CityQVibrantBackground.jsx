"use client";

import Box from "@mui/material/Box";

/**
 * Vibrant nav backdrop without bundled .webp assets (Aurora template images may be absent in repo).
 * Matches the visual role of docs/aurora VibrantBackground for side/top positions.
 */
export default function CityQVibrantBackground({ position }) {
  const isTop = position === "top";
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: "100%",
        pointerEvents: "none",
        background: isTop
          ? "linear-gradient(135deg, rgba(166,65,250,0.22) 0%, rgba(51,133,240,0.18) 100%)"
          : "linear-gradient(180deg, rgba(166,65,250,0.18) 0%, rgba(51,133,240,0.12) 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          bgcolor: "background.default",
          opacity: 0.78,
        },
      }}
    />
  );
}
