"use client";

import { Backdrop, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import { useBreakpoints } from "providers/BreakpointsProvider";
import { useSettingsContext } from "providers/SettingsProvider";
import { sidenavVibrantStyle } from "theme/styles/vibrantNav";
import CityQVibrantBackground from "./CityQVibrantBackground";
import CityQSidenavCollapse from "./CityQSidenavCollapse";
import CityQSidenavDrawerContent from "./CityQSidenavDrawerContent";

export default function CityQSidenav() {
  const {
    config: { sidenavCollapsed, drawerWidth, navColor },
    toggleNavbarCollapse,
  } = useSettingsContext();
  const { currentBreakpoint } = useBreakpoints();

  const theme = useTheme();

  return (
    <Box
      component="nav"
      className="default-sidenav"
      sx={[
        {
          width: { md: drawerWidth },
          flexShrink: { sm: 0 },
          transition: {
            xs: theme.transitions.create(["width"], {
              duration: theme.transitions.duration.standard,
            }),
            lg: "none",
          },
          position: { md: "absolute", lg: "static" },
        },
        navColor === "vibrant" && sidenavVibrantStyle,
      ]}
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          [`& .${drawerClasses.paper}`]: {
            overflow: "visible",
            boxSizing: "border-box",
            width: drawerWidth,
            border: 0,
            borderRight: navColor === "vibrant" ? 0 : 1,
            borderColor: "divider",
            transition: {
              xs: theme.transitions.create(["width"], {
                duration: theme.transitions.duration.standard,
              }),
              lg: "none",
            },
          },
        }}
        open
      >
        {navColor === "vibrant" && <CityQVibrantBackground position="side" />}
        <CityQSidenavDrawerContent variant="permanent" />
        <CityQSidenavCollapse />
      </Drawer>
      {currentBreakpoint === "md" && (
        <Backdrop open={!sidenavCollapsed} sx={{ zIndex: 1199 }} onClick={toggleNavbarCollapse} />
      )}
    </Box>
  );
}
