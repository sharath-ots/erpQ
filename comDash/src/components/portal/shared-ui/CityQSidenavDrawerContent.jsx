"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Divider,
  IconButton,
  List,
  Toolbar,
} from "@mui/material";
import IconifyIcon from "components/base/IconifyIcon";
import SidenavSimpleBar from "layouts/main-layout/sidenav/SidenavSimpleBar";
import { useSettingsContext } from "providers/SettingsProvider";
import { useNavContext } from "layouts/main-layout/NavProvider";
import { usePortalMenu } from "./PortalMenuContext";
import NavItem from "layouts/main-layout/sidenav/NavItem";
import CityQLogo from "./CityQLogo";

function safePathName(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function guessIcon(node, hasChildren) {
  if (node?.icon) return node.icon;
  if (hasChildren) return "material-symbols:folder-outline-rounded";
  const key = String(node?.key ?? node?.label ?? node?.path ?? "").toLowerCase();
  if (key.includes("crm")) return "material-symbols:phone-in-talk-outline-rounded";
  if (key.includes("hr")) return "material-symbols:manage-accounts-outline";
  if (key.includes("pur") || key.includes("purchase")) return "material-symbols:shopping-bag-outline-rounded";
  if (key.includes("core") || key.includes("settings")) return "material-symbols:settings-outline-rounded";
  if (key.includes("auth") || key.includes("login")) return "material-symbols:security-rounded";
  if (key.includes("dashboard") || key === "/") return "material-symbols:dashboard-outline-rounded";
  return "material-symbols:chevron-right-rounded";
}

function toAuroraItem(node, idx, parentKey = "menu") {
  const label = String(node?.label ?? node?.key ?? node?.path ?? "Item");
  const rawKey = node?.key || node?.path || `${parentKey}-${idx}-${label}`;
  const pathName = safePathName(rawKey) || `${parentKey}-${idx}`;

  const children = Array.isArray(node?.children) ? node.children : [];
  const hasChildren = children.length > 0;

  const base = {
    pathName,
    // NavItem uses i18n key/name; we pass label so it renders even without translations.
    key: label,
    name: label,
    path: typeof node?.path === "string" ? node.path : "#",
    icon: guessIcon(node, hasChildren),
    // Portal-menu items can be disabled/have no path; keep them visible.
    active: node?.active !== false,
    selectionPrefix: typeof node?.selectionPrefix === "string" ? node.selectionPrefix : undefined,
  };

  if (hasChildren) {
    return {
      ...base,
      items: children.map((c, i) => toAuroraItem(c, i, pathName)),
    };
  }
  return base;
}

export default function CityQSidenavDrawerContent({ variant = "permanent" }) {
  const { menuItems } = usePortalMenu();
  const pathname = usePathname();
  const router = useRouter();
  const {
    config: { sidenavCollapsed, openNavbarDrawer, navigationMenuType },
    setConfig,
  } = useSettingsContext();
  const { sidenavAppbarVariant } = useNavContext();

  const expanded = useMemo(
    () => variant === "temporary" || (variant === "permanent" && !sidenavCollapsed),
    [variant, sidenavCollapsed],
  );

  const onNavigate = useCallback(
    (item) => {
      if (item?.path && item.path !== "#") router.push(item.path);
      if (openNavbarDrawer) {
        setConfig({ openNavbarDrawer: false });
      }
    },
    [openNavbarDrawer, router, setConfig],
  );

  const toggleNavbarDrawer = () => {
    setConfig({
      openNavbarDrawer: !openNavbarDrawer,
    });
  };

  return (
    <>
      <Toolbar variant={sidenavAppbarVariant} sx={{ display: "block", px: { xs: 0 } }}>
        <Box
          sx={[
            {
              height: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
            !expanded && {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
            expanded && {
              pl: { xs: 4, md: 6 },
              pr: { xs: 2, md: 3 },
            },
          ]}
        >
          {(navigationMenuType === "sidenav" || variant === "temporary") && (
            <>
              <CityQLogo showName={expanded} />
              <IconButton
                sx={{ mt: 1, display: { md: "none" } }}
                onClick={toggleNavbarDrawer}
                aria-label="Close menu"
              >
                <IconifyIcon icon="material-symbols:left-panel-close-outline" fontSize={20} />
              </IconButton>
            </>
          )}
        </Box>
      </Toolbar>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <SidenavSimpleBar>
          <Box
            sx={[
              { py: 2 },
              !expanded && { px: 2 },
              expanded && { px: { xs: 2, md: 4 } },
            ]}
          >
            <Divider sx={{ mb: 2 }} />
            <List
              dense
              sx={{
                pb: 0,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {menuItems.map((node, idx) => {
                const item = toAuroraItem(node, idx);
                // Ensure selection works for portal root route.
                if (item.path === "#" && pathname === "/") {
                  item.path = "/";
                }
                return <NavItem key={item.pathName} item={item} level={0} />;
              })}
            </List>
          </Box>
        </SidenavSimpleBar>
      </Box>
    </>
  );
}
