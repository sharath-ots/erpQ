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

// --- 1. THE UPDATED ICON GUESSER ---
function guessIcon(node, hasChildren) {
  // Always respect an explicitly provided icon first
  if (node?.icon) return node.icon;

  // Combine all possible identifiers into one lowercase string to check against
  const identifier = String(node?.key ?? node?.label ?? node?.name ?? node?.path ?? "").toLowerCase();

  // TOP LEVEL MODULES
  if (identifier.includes("crm")) return "material-symbols:headset-mic-outline-rounded";
  if (identifier.includes("hr")) return "material-symbols:badge-outline-rounded";
  if (identifier.includes("pur") || identifier.includes("purchase")) return "material-symbols:shopping-cart-outline-rounded";
  if (identifier.includes("erpnext") || identifier.includes("desk")) return "material-symbols:desktop-windows-outline-rounded";

  // SPECIFIC LEAF ROUTES
  if (identifier.includes("dashboard") || identifier === "/") return "material-symbols:dashboard-outline-rounded";
  if (identifier.includes("lead")) return "material-symbols:person-search-outline-rounded";
  if (identifier.includes("opportun")) return "material-symbols:trending-up-rounded";
  if (identifier.includes("customer") || identifier.includes("client")) return "material-symbols:groups-outline-rounded";
  if (identifier.includes("contact")) return "material-symbols:contacts-outline-rounded";
  if (identifier.includes("quotation") || identifier.includes("quote")) return "material-symbols:request-quote-outline-rounded";
  if (identifier.includes("doctype") || identifier.includes("other")) return "material-symbols:category-outline-rounded";
  if (identifier.includes("core") || identifier.includes("setting")) return "material-symbols:settings-outline-rounded";
  if (identifier.includes("auth") || identifier.includes("login")) return "material-symbols:security-rounded";

  // PREMIUM FALLBACKS
  // If it's a folder, give it a nice folder icon. If it's a leaf, give it a tiny dot.
  return hasChildren
    ? "material-symbols:folder-open-outline-rounded"
    : "material-symbols:radio-button-unchecked-rounded";
}

// --- 2. THE UPDATED MAPPER ---
function toAuroraItem(node, idx, parentKey = "menu") {
  const label = String(node?.label ?? node?.key ?? node?.path ?? "Item");
  const rawKey = node?.key || node?.path || `${parentKey}-${idx}-${label}`;
  const pathName = safePathName(rawKey) || `${parentKey}-${idx}`;

  const children = Array.isArray(node?.children) ? node.children : [];
  const hasChildren = children.length > 0;

  const base = {
    pathName,
    key: label,
    name: label,
    path: typeof node?.path === "string" ? node.path : "#",
    // Call the fixed guessIcon function
    icon: guessIcon(node, hasChildren),
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

  const orderedMenuItems = useMemo(() => {
    const list = Array.isArray(menuItems) ? menuItems : [];
    const rank = (node) => {
      const key = String(node?.label ?? node?.key ?? node?.path ?? "").toLowerCase();
      if (key.includes("crm")) return 10;
      if (key.includes("hr")) return 20;
      if (key.includes("pur") || key.includes("purchase")) return 30;
      // Push ERPNext full desk to bottom.
      if (key.includes("erpnext") && key.includes("full")) return 1000;
      return 100;
    };
    return list
      .map((n, i) => ({ n, i, r: rank(n) }))
      .sort((a, b) => (a.r - b.r) || (a.i - b.i))
      .map((x) => x.n);
  }, [menuItems]);

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
              pl: { xs: 2, md: 3 },
              pr: { xs: 1, md: 1.5 },
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
              { py: 1 },
              !expanded && { px: 1 },
              expanded && { px: { xs: 1, md: 2 } },
            ]}
          >

            <List
              dense
              sx={{
                pb: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {orderedMenuItems.map((node, idx) => {
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
