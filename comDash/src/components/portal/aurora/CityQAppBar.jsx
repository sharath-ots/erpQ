"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useBreakpoints } from "providers/BreakpointsProvider";
import { useSettingsContext } from "providers/SettingsProvider";
import { topnavVibrantStyle } from "theme/styles/vibrantNav";
import IconifyIcon from "components/base/IconifyIcon";
import CityQVibrantBackground from "./CityQVibrantBackground";
import CityQLogo from "./CityQLogo";
import CityQAppbarActionItems from "./CityQAppbarActionItems";

export default function CityQAppBar() {
  const {
    config: { drawerWidth, sidenavType, navColor },
    handleDrawerToggle,
  } = useSettingsContext();

  const { up } = useBreakpoints();
  const upSm = up("sm");
  const upMd = up("md");

  const prevSidenavTypeRef = useRef(sidenavType);

  useEffect(() => {
    if (prevSidenavTypeRef.current !== sidenavType) {
      prevSidenavTypeRef.current = sidenavType;
    }
  }, [sidenavType]);

  return (
    <MuiAppBar
      position="fixed"
      sx={[
        {
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: `1px solid`,
          borderColor: "divider",
        },
        navColor === "vibrant" && !upMd && topnavVibrantStyle,
      ]}
    >
      {navColor === "vibrant" && !upMd && <CityQVibrantBackground position="top" />}
      <Toolbar variant="appbar" sx={{ px: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1,
            pr: 2,
          }}
        >
          <Button
            color="neutral"
            variant="soft"
            shape="circle"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
          >
            <IconifyIcon icon="material-symbols:menu-rounded" sx={{ fontSize: 20 }} />
          </Button>
          <CityQLogo showName={upSm} />
        </Box>

        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            flex: 1,
            width: 1,
          }}
        >
          <Box sx={{ display: { xs: "none", md: "block" }, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              CityQ — Central Portal
            </Typography>
          </Box>
          <CityQAppbarActionItems />
        </Stack>
      </Toolbar>
    </MuiAppBar>
  );
}
