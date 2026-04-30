"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  listItemIconClasses,
  MenuItem,
  paperClasses,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import Menu from "@mui/material/Menu";
import IconifyIcon from "components/base/IconifyIcon";
import StatusAvatar from "components/base/StatusAvatar";
import { useThemeMode } from "hooks/useThemeMode";
import { useSettingsContext } from "providers/SettingsProvider";
import { redirectToLogin } from "@/lib/apigate";
import { usePortalMenu } from "./PortalMenuContext";

function displayNameFromEmail(email) {
  if (!email) return "Guest";
  const base = String(email).split("@")[0] || "Guest";
  return base
    .split(/[._-]+/g)
    .filter(Boolean)
    .map((s) => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function CityQProfileMenu({ type = "default" }) {
  const { email } = usePortalMenu();
  const userName = useMemo(() => displayNameFromEmail(email), [email]);
  const avatarSrc = "/avatar-placeholder.svg";
  const { themePreset, setThemePreset } = useThemeMode();
  const {
    config: { textDirection },
  } = useSettingsContext();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isDark = themePreset === "default-dark";
  const handleThemeToggle = () => {
    setThemePreset(isDark ? "default-light" : "default-dark", { updateMode: true });
  };

  return (
    <>
      <Button
        color="neutral"
        variant="text"
        shape="circle"
        onClick={handleClick}
        sx={[
          { height: 44, width: 44 },
          type === "slim" && { height: 30, width: 30, minWidth: 30 },
        ]}
      >
        <StatusAvatar
          alt={userName}
          status="online"
          src={avatarSrc}
          sx={[
            {
              width: 40,
              height: 40,
              border: 2,
              borderColor: "background.paper",
            },
            type === "slim" && {
              width: 24,
              height: 24,
              border: 1,
              borderColor: "background.paper",
            },
          ]}
        />
      </Button>

      <Menu
        anchorEl={anchorEl}
        id="cityq-profile-menu"
        open={open}
        onClose={handleClose}
        transformOrigin={{
          horizontal: textDirection === "rtl" ? "left" : "right",
          vertical: "top",
        }}
        anchorOrigin={{
          horizontal: textDirection === "rtl" ? "left" : "right",
          vertical: "bottom",
        }}
        sx={{
          [`& .${paperClasses.root}`]: { minWidth: 320 },
        }}
      >
        <Stack sx={{ alignItems: "center", gap: 2, px: 3, py: 2 }}>
          <StatusAvatar status="online" alt={userName} src={avatarSrc} sx={{ width: 48, height: 48 }} />
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {userName}
            </Typography>
            <Typography variant="subtitle2" sx={{ color: "warning.main" }}>
              Merchant Captian{" "}
              <IconifyIcon
                icon="material-symbols:diamond-rounded"
                color="warning.main"
                sx={{ verticalAlign: "text-bottom", ml: 0.5 }}
              />
            </Typography>
            {email ? (
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                {email}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        <Divider />

        <Box sx={{ py: 1 }}>
          <MenuRow icon="material-symbols:accessible-forward-rounded" onClick={handleClose}>
            Accessibility
          </MenuRow>
          <MenuRow icon="material-symbols:settings-outline-rounded" onClick={handleClose}>
            Preferences
          </MenuRow>
          {/* <MenuRow icon="material-symbols:dark-mode-outline-rounded" onClick={handleThemeToggle}>
            Dark mode
            <Switch checked={isDark} onChange={handleThemeToggle} sx={{ ml: "auto" }} />
          </MenuRow> */}
        </Box>

        <Divider />

        <Box sx={{ py: 1 }}>
          <MenuRow icon="material-symbols:manage-accounts-outline-rounded" onClick={handleClose}>
            Account Settings
          </MenuRow>
          <MenuRow icon="material-symbols:question-mark-rounded" onClick={handleClose}>
            Help Center
          </MenuRow>
        </Box>

        <Divider />

        <Box sx={{ py: 1 }}>
          <MenuRow
            icon="material-symbols:logout-rounded"
            onClick={async () => {
              handleClose();
              await redirectToLogin();
            }}
          >
            Sign Out
          </MenuRow>
        </Box>
      </Menu>
    </>
  );
}

function MenuRow({ icon, onClick, children, sx }) {
  return (
    <MenuItem onClick={onClick} sx={{ gap: 1, ...sx }}>
      <ListItemIcon
        sx={{
          [`&.${listItemIconClasses.root}`]: { minWidth: "unset !important" },
        }}
      >
        <IconifyIcon icon={icon} sx={{ color: "text.secondary" }} />
      </ListItemIcon>
      {children}
    </MenuItem>
  );
}

