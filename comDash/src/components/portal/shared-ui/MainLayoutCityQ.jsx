"use client";

import { Drawer, drawerClasses } from "@mui/material";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import clsx from "clsx";
import { mainDrawerWidth } from "lib/constants";
import { useSettingsContext } from "providers/SettingsProvider";
import { sidenavVibrantStyle } from "theme/styles/vibrantNav";
import CityQVibrantBackground from "./CityQVibrantBackground";
import NavProvider from "layouts/main-layout/NavProvider";
import Footer from "layouts/main-layout/footer";
import CityQAppBar from "./CityQAppBar";
import CityQSidenav from "./CityQSidenav";
import CityQSidenavDrawerContent from "./CityQSidenavDrawerContent";

/**
 * Aurora MainLayout pattern (sidenav + app bar + footer) wired to CityQ portal routes.
 */
export default function MainLayoutCityQ({ children }) {
  const {
    config: { drawerWidth, openNavbarDrawer, navColor },
    setConfig,
  } = useSettingsContext();

  const toggleNavbarDrawer = () => {
    setConfig({
      openNavbarDrawer: !openNavbarDrawer,
    });
  };

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
          <CityQSidenav />

          <Drawer
            variant="temporary"
            open={openNavbarDrawer}
            onClose={toggleNavbarDrawer}
            ModalProps={{
              keepMounted: true,
            }}
            sx={[
              {
                display: { xs: "block", md: "none" },
                [`& .${drawerClasses.paper}`]: {
                  pt: 3,
                  boxSizing: "border-box",
                  width: mainDrawerWidth.full,
                },
              },
              navColor === "vibrant" && sidenavVibrantStyle,
            ]}
          >
            {navColor === "vibrant" && <CityQVibrantBackground position="side" />}
            <CityQSidenavDrawerContent variant="temporary" />
          </Drawer>

          <Box
            component="main"
            sx={[
              {
                flexGrow: 1,
                p: 0,
                minHeight: "100vh",
                width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
                display: "flex",
                flexDirection: "column",
              },
              {
                ml: { md: `${mainDrawerWidth.collapsed}px`, lg: 0 },
              },
            ]}
          >
            <Toolbar variant="appbar" />

            <Box sx={{ flex: 1 }}>
              <Box
                sx={[
                  {
                    height: 1,
                    bgcolor: "background.default",
                  },
                ]}
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
