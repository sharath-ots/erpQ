"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Backdrop, Drawer, drawerClasses, ListSubheader, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Toolbar from "@mui/material/Toolbar";
import { useBreakpoints } from "providers/BreakpointsProvider";
import { useSettingsContext } from "providers/SettingsProvider";
import { sidenavVibrantStyle } from "theme/styles/vibrantNav";
import VibrantBackground from "components/common/VibrantBackground";
import Logo from "components/common/Logo";
import NavItem from "../../ui/layouts/main-layout/sidenav/NavItem";
import SidenavCollapse from "../../ui/layouts/main-layout/sidenav/SidenavCollapse";
import SidenavSimpleBar from "../../ui/layouts/main-layout/sidenav/SidenavSimpleBar";
import { usePortalMenu } from "./PortalMenuProvider";
import { findModulePortalRoot, portalChildrenToNavItems, docqNavForUser } from "./modulePortalNav";
import { getAccessToken, parseCityQJwtPayload } from "@/lib/apigate";

function ModulePortalSidenavContent({ moduleRoot, expanded, docqChildren }) {
  const navItems = useMemo(
    () => portalChildrenToNavItems(docqChildren ?? moduleRoot?.children ?? []),
    [docqChildren, moduleRoot],
  );

  return (
    <>
      <Toolbar variant="appbar" sx={{ display: "block", px: { xs: 0 } }}>
        <Box
          sx={{
            height: 1,
            display: "flex",
            justifyContent: expanded ? "flex-start" : "center",
            alignItems: "center",
            pl: expanded ? { xs: 4, md: 6 } : 0,
            pr: expanded ? { xs: 2, md: 3 } : 0,
          }}
        >
          <Logo showName={expanded} />
        </Box>
      </Toolbar>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <SidenavSimpleBar>
          <Box sx={{ py: 2, px: expanded ? { xs: 2, md: 4 } : 2 }}>
            <List
              dense
              sx={{ display: "flex", flexDirection: "column", gap: "2px" }}
              subheader={
                moduleRoot?.label ? (
                  <ListSubheader
                    component="div"
                    disableGutters
                    sx={{
                      textAlign: expanded ? "left" : "center",
                      color: "text.disabled",
                      typography: "overline",
                      fontWeight: 700,
                      py: 1,
                      paddingLeft: expanded ? 2 : 0,
                      mb: 0.25,
                      position: "static",
                      background: "transparent",
                    }}
                  >
                    {moduleRoot.label}
                  </ListSubheader>
                ) : null
              }
            >
              {navItems.map((item) => (
                <NavItem key={item.pathName} item={item} level={0} />
              ))}
            </List>
          </Box>
        </SidenavSimpleBar>
      </Box>
    </>
  );
}

/** Module-specific sidebar (Supplier Portal, Purchasing, HR) from apiGate portal menu. */
export default function ModulePortalSidenav({ variant = "permanent" }) {
  const pathname = usePathname();
  const theme = useTheme();
  const { menuItems } = usePortalMenu();
  const moduleRoot = findModulePortalRoot(pathname, menuItems);
  const isDocq = /^\/m\/docq/i.test(pathname);
  const isDocAdmin = Boolean(parseCityQJwtPayload(getAccessToken())?.isDocAdmin);
  const docqChildren = isDocq ? docqNavForUser(isDocAdmin) : null;

  const {
    config: { sidenavCollapsed, drawerWidth, navColor },
    toggleNavbarCollapse,
  } = useSettingsContext();
  const { currentBreakpoint } = useBreakpoints();

  const expanded = variant === "temporary" || (variant === "permanent" && !sidenavCollapsed);

  if (variant === "temporary") {
    return (
      <ModulePortalSidenavContent moduleRoot={moduleRoot} docqChildren={docqChildren} expanded />
    );
  }

  return (
    <Box
      component="nav"
      className="module-portal-sidenav"
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
          },
        }}
        open
      >
        {navColor === "vibrant" && <VibrantBackground position="side" />}
        <ModulePortalSidenavContent moduleRoot={moduleRoot} docqChildren={docqChildren} expanded={expanded} />
        <SidenavCollapse />
      </Drawer>
      {currentBreakpoint === "md" && (
        <Backdrop open={!sidenavCollapsed} sx={{ zIndex: 1199 }} onClick={toggleNavbarCollapse} />
      )}
    </Box>
  );
}
