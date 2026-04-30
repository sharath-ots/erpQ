"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";

export default function CityQLogo({ showName = true }) {
  return (
    <Box
      component={Link}
      href="/"
      sx={{
        display: "flex",
        alignItems: "center",
        textDecoration: "none",
        color: "primary.main",
        gap: 0.5,
      }}
    >
      <Typography variant="h6" fontWeight={900}>
        Q
      </Typography>
      <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
        Portal
      </Typography>
    </Box>
  );
}
