"use client";

import { Avatar, Stack, Typography } from "@mui/material";
import ThemeToggler from "layouts/main-layout/common/ThemeToggler";
import { usePortalMenu } from "./PortalMenuContext";

export default function CityQAppbarActionItems() {
  const { email } = usePortalMenu();
  const label = email ?? "";

  return (
    <Stack
      className="action-items"
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        ml: "auto",
      }}
    >
      {label ? (
        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
          {label}
        </Typography>
      ) : null}
      <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
        {(label || "?").slice(0, 1).toUpperCase()}
      </Avatar>
      <ThemeToggler type="default" />
    </Stack>
  );
}
