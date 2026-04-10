"use client";

import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

export default function DashboardMenu() {
  return (
    <IconButton size="small" aria-label="dashboard menu">
      <Typography component="span" sx={{ lineHeight: 1, fontSize: 18 }}>
        ⋮
      </Typography>
    </IconButton>
  );
}

