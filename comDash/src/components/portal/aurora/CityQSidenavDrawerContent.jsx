"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import IconifyIcon from "components/base/IconifyIcon";
import SidenavSimpleBar from "layouts/main-layout/sidenav/SidenavSimpleBar";
import { useSettingsContext } from "providers/SettingsProvider";
import { useNavContext } from "layouts/main-layout/NavProvider";
import { findMenuItem } from "@/lib/menuMatch";
import CityQLogo from "./CityQLogo";
import { usePortalMenu } from "./PortalMenuContext";

const LEAF_ICON = "material-symbols:chevron-right-rounded";
const GROUP_ICON = "material-symbols:folder-outline-rounded";

function collectOpenKeys(nodes, pathname, out = new Set()) {
  if (!nodes?.length) return out;
  for (const n of nodes) {
    if (n.children?.length) {
      const childHit = findMenuItem(n.children, pathname);
      const prefixHit = n.children.some(
        (c) =>
          c.path && (pathname === c.path || pathname.startsWith(`${c.path}/`)),
      );
      if (childHit || prefixHit) {
        if (n.key) out.add(n.key);
        collectOpenKeys(n.children, pathname, out);
      }
    }
  }
  return out;
}

function PortalNavBranch({ item, level, openKeys, toggleKey, onNavigate }) {
  const pathname = usePathname();
  const hasChildren = Boolean(item.children?.length);
  const open = hasChildren && item.key && openKeys.has(item.key);
  const selected =
    !hasChildren &&
    item.path &&
    (pathname === item.path || pathname.startsWith(`${item.path}/`));

  if (hasChildren) {
    return (
      <Box key={item.key}>
        <ListItemButton
          onClick={() => toggleKey(item.key)}
          sx={{ pl: 2 + level * 2 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconifyIcon icon={GROUP_ICON} width={22} height={22} />
          </ListItemIcon>
          <ListItemText primary={item.label} />
          <IconifyIcon
            icon="material-symbols:expand-more-rounded"
            sx={{
              fontSize: 18,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((ch) => (
              <PortalNavBranch
                key={ch.key || ch.path}
                item={ch}
                level={level + 1}
                openKeys={openKeys}
                toggleKey={toggleKey}
                onNavigate={onNavigate}
              />
            ))}
          </List>
        </Collapse>
      </Box>
    );
  }

  return (
    <ListItemButton
      key={item.key || item.path}
      selected={Boolean(selected)}
      onClick={() => onNavigate(item)}
      sx={{ pl: 2 + level * 2 }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <IconifyIcon icon={LEAF_ICON} width={20} height={20} />
      </ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
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

  const [openKeys, setOpenKeys] = useState(() => new Set());

  useEffect(() => {
    setOpenKeys(collectOpenKeys(menuItems, pathname, new Set()));
  }, [menuItems, pathname]);

  const toggleKey = useCallback((key) => {
    if (!key) return;
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onNavigate = useCallback(
    (item) => {
      if (item.openInNewTab && item.externalUrl) {
        window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      } else if (item.path) {
        router.push(item.path);
      } else if (item.externalUrl) {
        window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      }
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
            <List dense sx={{ py: 0 }}>
              {menuItems.map((item) => (
                <PortalNavBranch
                  key={item.key || item.path}
                  item={item}
                  level={0}
                  openKeys={openKeys}
                  toggleKey={toggleKey}
                  onNavigate={onNavigate}
                />
              ))}
            </List>
          </Box>
        </SidenavSimpleBar>
      </Box>
    </>
  );
}
