"use client";

import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import clsx from "clsx";
import { useSettingsContext } from "providers/SettingsProvider";
import NavProvider from "layouts/main-layout/NavProvider";
import Footer from "layouts/main-layout/footer";
import CityQAppBar from "./CityQAppBar";
import { usePathname } from "next/navigation";

// 🚀 EXPERT FIX: Import the new unified premium sidebar!
import CityQPremiumSidebar from "./CityQPremiumSidebar";

// Match the exact widths from the premium sidebar
const DRAWER_WIDTH = {
  expanded: 300,
  collapsed: 136,
};

/**
 * Aurora MainLayout pattern (premium sidenav + app bar + footer) wired to CityQ portal routes.
 */
export default function MainLayoutCityQ({ children }) {
  const pathname = usePathname();
  const theme = useTheme();

  const {
    config: { navColor, sidenavCollapsed },
  } = useSettingsContext();

  // If you are hiding the layout on lead details, this keeps that logic intact
  if (pathname.includes('/lead-list')) {
    return <>{children}</>;
  }

  if (pathname.includes('/list/Lead')) {
    return <>{children}</>;
  }

  if (pathname.includes('/add-lead')) {
    return <>{children}</>;
  }

  if (pathname.includes('/view-lead')) {
    return <>{children}</>;
  }

  if (pathname.includes('/edit-lead')) {
    return <>{children}</>;
  }

  // Calculate the current active width so the main content knows how much space it has
  const currentWidth = sidenavCollapsed ? DRAWER_WIDTH.collapsed : DRAWER_WIDTH.expanded;

  // 🚀 EXPERT FIX: This guarantees the main content slides smoothly alongside the sidebar
  const smoothTransition = theme.transitions.create(['width', 'margin-left'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  });

  return (
    <Box>
      <Box
        className={clsx({
          "nav-vibrant": navColor === "vibrant",
        })}
        sx={{ display: "flex", zIndex: 1, position: "relative" }}
      >
        <NavProvider>
          <CityQAppBar />

          {/* 🚀 THE NEW SIDEBAR HANDLES BOTH DESKTOP AND MOBILE INTERNALLY NOW */}
          <CityQPremiumSidebar />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0,
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              // Dynamically resize based on the sidebar state
              width: { xs: "100%", md: `calc(100% - ${currentWidth}px)` },
              transition: smoothTransition,
            }}
          >
            <Toolbar variant="appbar" />

            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  height: 1,
                  bgcolor: "background.default",
                }}
              >
                {children}
              </Box>
            </Box>
            <Footer />
          </Box>
        </NavProvider>
      </Box>
    </Box>
  );
}