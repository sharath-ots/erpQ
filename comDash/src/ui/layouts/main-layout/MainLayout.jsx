'use client';
import { useMemo, useEffect } from 'react';
import { Drawer, drawerClasses, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import clsx from 'clsx';
import AppBar from './app-bar/index';
import Sidenav from '../main-layout/sidenav/index';
import Topnav from './topnav';
import TopNavStacked from './topnav/TopNavStacked';
import Footer from './footer';
import NavProvider from './NavProvider';
import SidenavDrawerContent from './sidenav/SidenavDrawerContent';
import { mainDrawerWidth } from '../../lib/constants';
import { useSettingsContext } from '../../providers/SettingsProvider';
import { useThemeMode } from '../../hooks/useThemeMode';
import { usePathname } from "next/navigation";
import { ConfigProvider, theme as antdTheme } from 'antd';
import { LeadProvider } from '../../../../../crmQ/src/contexts/LeadContext';
import LeadSideBar from '../../../../../crmQ/components/side-and-header/LeadSideAndHeaderLayout';

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
      alignItems: 'center'
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
        transition: 'filter 0.3s ease-in-out'
      }}
    />
  </Box>
);

const MainLayout = ({ children }) => {

  const pathname = usePathname();
  const theme = useTheme();

  const { isDark } = useThemeMode();

  const { config, setConfig } = useSettingsContext();

  const {
    sidenavType,
    navigationMenuType,
    topnavType,
    openNavbarDrawer,
    navColor
  } = config;

  const isNoLayoutRoute =
    pathname.includes('/add-lead') ||
    pathname.includes('/view-lead') ||
    pathname.includes('/edit-lead');

  const isLeadRoute =
    pathname.includes('/lead-list') ||
    pathname.includes('/list/Lead');

  useEffect(() => {

    if (!isLeadRoute && sidenavType === 'collapsed') {
      setConfig({
        ...config,
        sidenavType: 'default'
      });
    }

  }, [isLeadRoute]);

  const isCollapsed = sidenavType === 'collapsed';

  const leadSidebarWidth = isCollapsed
    ? mainDrawerWidth.collapsed
    : mainDrawerWidth.full;

  const sidebarWidth = isCollapsed
    ? mainDrawerWidth.collapsed
    : mainDrawerWidth.full;

  const toggleNavbarDrawer = () => {
    setConfig({
      openNavbarDrawer: !openNavbarDrawer
    });
  };

  const toggleDesktopSidebar = () => {
    setConfig({
      ...config,
      sidenavType: isCollapsed ? 'default' : 'collapsed'
    });
  };

  const toolbarVarint = useMemo(() => {

    if (navigationMenuType !== 'sidenav') {

      if (topnavType === 'stacked') {
        return 'appbarStacked';
      }
    }

    return 'appbar';

  }, [navigationMenuType, topnavType]);

  if (isNoLayoutRoute) {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm
        }}
      >
        <GlobalWatermark isDark={isDark} />
        {children}
      </ConfigProvider>
    );
  }

  const layoutContent = (

    <Box
      className={clsx({
        'nav-vibrant': navColor === 'vibrant'
      })}
      sx={{
        display: 'flex',
        zIndex: 1,
        position: 'relative'
      }}
    >

      <NavProvider>

        {navigationMenuType === 'sidenav' && <AppBar customDrawerWidth={isLeadRoute ? leadSidebarWidth : null} />}

        {(navigationMenuType === 'sidenav' ||
          navigationMenuType === 'combo') && (
            <>
              {isLeadRoute ? (
                <LeadSideBar
                  isCollapsed={isCollapsed}
                  onToggleDesktop={toggleDesktopSidebar}
                />
              ) : (
                <Sidenav />
              )}
            </>
          )}
        {(navigationMenuType === 'topnav' ||
          navigationMenuType === 'combo') && (
            <>
              {topnavType === 'default' && <Topnav />}
              {topnavType === 'stacked' && <TopNavStacked />}
            </>
          )}

        <Drawer
          variant="temporary"
          open={openNavbarDrawer}
          onClose={toggleNavbarDrawer}
          ModalProps={{ keepMounted: true }}
          sx={[{
            display: { xs: 'block', md: 'none' },
            [`& .${drawerClasses.paper}`]: {
              pt: 3,
              boxSizing: 'border-box',
              width: mainDrawerWidth.full
            }
          }]}
        >

          {isLeadRoute ? (
            <LeadSideBar
              isCollapsed={false}
              onToggleDesktop={toggleNavbarDrawer}
            />
          ) : (
            <SidenavDrawerContent variant="temporary" />
          )}

        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: {
              xs: '100%',
              md: `calc(100% - ${sidebarWidth}px)`
            },
            transition: theme.transitions.create(
              ['width', 'margin'],
              {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }
            ),
          }}
        >

          <Toolbar
            variant={toolbarVarint}
            sx={{ flexShrink: 0 }}
          />

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >

            <ConfigProvider
              theme={{
                algorithm: isDark
                  ? antdTheme.darkAlgorithm
                  : antdTheme.defaultAlgorithm
              }}
            >

              <GlobalWatermark isDark={isDark} />

              {children}

            </ConfigProvider>

          </Box>

          {!isLeadRoute && <Footer />}

        </Box>

      </NavProvider>

    </Box>
  );

  return isLeadRoute
    ? <LeadProvider>{layoutContent}</LeadProvider>
    : layoutContent;
};

export default MainLayout;