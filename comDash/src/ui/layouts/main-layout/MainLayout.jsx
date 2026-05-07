'use client';

import { useMemo } from 'react';
import { Drawer, drawerClasses } from '@mui/material';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import clsx from 'clsx';
import AppBar from './app-bar/index';
import Sidenav from '../main-layout/sidenav/index';
import { mainDrawerWidth } from '../../lib/constants';
import { useSettingsContext } from '../../providers/SettingsProvider';
import { sidenavVibrantStyle } from '../../theme/styles/vibrantNav';
import VibrantBackground from '../../components/common/VibrantBackground';
import NavProvider from './NavProvider';
import Footer from './footer';
import SidenavDrawerContent from './sidenav/SidenavDrawerContent';
import SlimSidenav from './sidenav/SlimSidenav';
import StackedSidenav from './sidenav/StackedSidenav';
import Topnav from './topnav';
import TopNavStacked from './topnav/TopNavStacked';
import TopnavSlim from './topnav/TopnavSlim';
import { usePathname } from "next/navigation";
import { useThemeMode } from '../../hooks/useThemeMode';
import { ConfigProvider, theme } from 'antd';

const GlobalWatermark = ({ isDark }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Box
      component="img"
      src="/logoq.png"
      alt="Watermark"
      sx={{
        width: '50%',
        maxWidth: '600px',
        filter: isDark
          ? 'grayscale(100%) brightness(0) invert(1) opacity(4%)'
          : 'grayscale(100%) brightness(0) opacity(6%)',
        transition: 'filter 0.3s ease-in-out', // Smooth fade when switching themes
      }}
    />
  </Box>
);

const MainLayout = ({ children }) => {
  const pathname = usePathname();

  const { isDark } = useThemeMode();

  const {
    config: {
      drawerWidth,
      sidenavType,
      navigationMenuType,
      topnavType,
      openNavbarDrawer,
      navColor,
    },
    setConfig,
  } = useSettingsContext();

  const toggleNavbarDrawer = () => {
    setConfig({
      openNavbarDrawer: !openNavbarDrawer,
    });
  };

  const toolbarVarint = useMemo(() => {
    if (navigationMenuType !== 'sidenav') {
      if (topnavType === 'slim') {
        return 'appbarSlim';
      }
      if (topnavType === 'stacked') {
        return 'appbarStacked';
      }
    }

    return 'appbar';
  }, [navigationMenuType, topnavType]);

  if (pathname.includes('/add-lead') ||
    pathname.includes('/view-lead') ||
    pathname.includes('/edit-lead')) {
    return (
      <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
        <GlobalWatermark isDark={isDark} />
        {children}
      </ConfigProvider>
    )
  }

  if (pathname.includes('/lead-list') ||
    pathname.includes('/list/Lead')) {
    return (
      <Box className={clsx({ 'nav-vibrant': navColor === 'vibrant' })} sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 1, position: 'relative' }}>
        <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
          <GlobalWatermark isDark={isDark} />

          <NavProvider>
            {/* Global Header */}
            {navigationMenuType === 'sidenav' && <AppBar />}
            {(navigationMenuType === 'topnav' || navigationMenuType === 'combo') && (
              <>
                {topnavType === 'default' && <Topnav />}
                {topnavType === 'slim' && <TopnavSlim />}
                {topnavType === 'stacked' && <TopNavStacked />}
              </>
            )}

            {/* 🚀 FIX: Removed the Toolbar spacer. Children now start at the very top of the screen */}
            <Box sx={{ flexGrow: 1, display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
              {children}
            </Box>

            <Drawer
              variant="temporary"
              open={openNavbarDrawer}
              onClose={toggleNavbarDrawer}
              ModalProps={{ keepMounted: true }}
              sx={[
                { display: { xs: 'block', md: 'none' }, [`& .${drawerClasses.paper}`]: { pt: 3, boxSizing: 'border-box', width: mainDrawerWidth.full } },
                navColor === 'vibrant' && sidenavVibrantStyle,
              ]}
            >
              {navColor === 'vibrant' && <VibrantBackground position="side" />}
              <SidenavDrawerContent variant="temporary" />
            </Drawer>

          </NavProvider>
        </ConfigProvider>
      </Box>
    );
  }

  // MAIN RETURN FOR ALL OTHER ROUTES
  return (
    <Box>
      <Box
        className={clsx({
          'nav-vibrant': navColor === 'vibrant',
        })}
        sx={{ display: 'flex', zIndex: 1, position: 'relative' }}
      >
        <NavProvider>
          {navigationMenuType === 'sidenav' && <AppBar />}

          {(navigationMenuType === 'sidenav' || navigationMenuType === 'combo') && (
            <>
              {sidenavType === 'default' && <Sidenav />}
              {sidenavType === 'slim' && <SlimSidenav />}
              {sidenavType === 'stacked' && <StackedSidenav />}
            </>
          )}

          {(navigationMenuType === 'topnav' || navigationMenuType === 'combo') && (
            <>
              {topnavType === 'default' && <Topnav />}
              {topnavType === 'slim' && <TopnavSlim />}
              {topnavType === 'stacked' && <TopNavStacked />}
            </>
          )}

          <Drawer
            variant="temporary"
            open={openNavbarDrawer}
            onClose={toggleNavbarDrawer}
            ModalProps={{
              keepMounted: true,
            }}
            sx={[
              {
                display: { xs: 'block', md: 'none' },
                [`& .${drawerClasses.paper}`]: {
                  pt: 3,
                  boxSizing: 'border-box',
                  width: mainDrawerWidth.full,
                },
              },
              navigationMenuType === 'topnav' && {
                display: { md: 'block', lg: 'none' },
              },
              navColor === 'vibrant' && sidenavVibrantStyle,
            ]}
          >
            {navColor === 'vibrant' && <VibrantBackground position="side" />}
            <SidenavDrawerContent variant="temporary" />
          </Drawer>

          <Box
            component="main"
            sx={[
              {
                flexGrow: 1,
                p: 0,
                minHeight: '100vh',
                width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
                display: 'flex',
                flexDirection: 'column',
              },
              sidenavType === 'default' && {
                ml: { md: `${mainDrawerWidth.collapsed}px`, lg: 0 },
              },
              sidenavType === 'stacked' && {
                ml: { md: `${mainDrawerWidth.stackedNavCollapsed}px`, lg: 0 },
              },
              sidenavType === 'slim' && {
                ml: { xs: 0 },
              },
              navigationMenuType === 'topnav' && {
                ml: { xs: 0 },
              },
            ]}
          >
            <Toolbar variant={toolbarVarint} />

            <Box sx={{ flex: 1 }}>
              <Box
                sx={[
                  {
                    height: 1,
                    bgcolor: 'background.default',
                  },
                ]}
              >
                <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
                  {/* 🚀 3. ADD WATERMARK HERE TOO */}
                  <GlobalWatermark isDark={isDark} />
                  {children}
                </ConfigProvider>
              </Box>
            </Box>
            <Footer />
          </Box>
        </NavProvider>
      </Box>
    </Box>
  );
};

export default MainLayout;