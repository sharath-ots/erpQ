"use client";

import { Stack } from "@mui/material";
import LanguageMenu from "layouts/main-layout/common/LanguageMenu";
import NotificationMenu from "layouts/main-layout/common/NotificationMenu";
import ThemeToggler from "layouts/main-layout/common/ThemeToggler";
import { usePortalMenu } from "./PortalMenuContext";
import CityQProfileMenu from "./CityQProfileMenu";

export default function CityQAppbarActionItems() {
  const { email } = usePortalMenu();
  const hasUser = Boolean(email);

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
      <LanguageMenu type="default" />
      <ThemeToggler type="default" />
      <NotificationMenu type="default" />
      <CityQProfileMenu type={hasUser ? "default" : "default"} />
    </Stack>
  );
}
