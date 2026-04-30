'use client';

import { useMemo } from 'react';
import {
    Box,
    Drawer,
    List,
    ListSubheader,
    Toolbar,
    IconButton,
    Divider,
    useTheme,
    useMediaQuery
} from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon'; // Adjust path if needed
import Logo from 'components/common/Logo'; // Adjust path if needed

// --- CONSTANTS FOR PERFECT SIZING ---
const DRAWER_WIDTH = {
    expanded: 300,
    collapsed: 136, // The unique Aurora compressed size (Icon + Text vertical)
};

export default function MainSidebar({
    isMobileOpen,
    onMobileClose,
    isCollapsed,
    toggleCollapse,
    navItems = [] // Pass your sitemap/menu items here
}) {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    // Calculate current desktop width
    const currentWidth = isCollapsed ? DRAWER_WIDTH.collapsed : DRAWER_WIDTH.expanded;

    // --- REUSABLE CSS TRANSITION ---
    const smoothTransition = theme.transitions.create(['width', 'transform'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.standard,
    });

    // --- THE CONTENT OF THE SIDEBAR ---
    const DrawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 1. HEADER & LOGO */}
            <Toolbar
                sx={{
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    px: isCollapsed ? 1 : 4,
                    transition: smoothTransition
                }}
            >
                <Logo showName={!isCollapsed} />

                {/* Mobile Close Button */}
                {!isDesktop && (
                    <IconButton onClick={onMobileClose}>
                        <IconifyIcon icon="material-symbols:close-rounded" />
                    </IconButton>
                )}
            </Toolbar>

            {/* 2. SCROLLABLE NAV MENU */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: isCollapsed ? 1 : 3, pb: 4 }}>
                {navItems.map((menuGroup, idx) => (
                    <Box key={idx} sx={{ mb: 3 }}>
                        {/* Subheader (Hidden when collapsed) */}
                        {menuGroup.subheader && !isCollapsed && (
                            <ListSubheader
                                disableSticky
                                sx={{
                                    bgcolor: 'transparent',
                                    typography: 'overline',
                                    fontWeight: 700,
                                    color: 'text.disabled',
                                    pl: 2
                                }}
                            >
                                {menuGroup.subheader}
                            </ListSubheader>
                        )}

                        {/* Menu Items */}
                        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {menuGroup.items.map((item) => (
                                <NavItem
                                    key={item.name}
                                    item={item}
                                    isCollapsed={isCollapsed}
                                    smoothTransition={smoothTransition}
                                />
                            ))}
                        </List>

                        {/* Separator between groups */}
                        {idx !== navItems.length - 1 && <Divider sx={{ mt: 3, mx: 2, borderStyle: 'dashed' }} />}
                    </Box>
                ))}
            </Box>
        </Box>
    );

    return (
        <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { md: currentWidth }, transition: smoothTransition }}>

            {/* --- MOBILE VIEW: TEMPORARY DRAWER --- */}
            <Drawer
                variant="temporary"
                open={isMobileOpen}
                onClose={onMobileClose}
                ModalProps={{ keepMounted: true }} // Better open performance on mobile
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH.expanded,
                        borderRight: 'none',
                        boxShadow: theme.shadows[8]
                    },
                }}
            >
                {DrawerContent}
            </Drawer>

            {/* --- DESKTOP VIEW: PERMANENT COMPRESSIBLE DRAWER --- */}
            <Drawer
                variant="permanent"
                open
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: currentWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        overflowX: 'hidden',
                        transition: smoothTransition, // This makes the compress/expand buttery smooth
                    },
                }}
            >
                {DrawerContent}

                {/* 3. THE FLOATING COLLAPSE BUTTON (Only on Desktop) */}
                <Box
                    onClick={toggleCollapse}
                    sx={{
                        position: 'absolute',
                        right: -16,
                        top: 40,
                        width: 32,
                        height: 32,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.1)' }
                    }}
                >
                    <IconifyIcon
                        icon={isCollapsed ? "material-symbols:chevron-right-rounded" : "material-symbols:chevron-left-rounded"}
                        color="text.secondary"
                    />
                </Box>
            </Drawer>
        </Box>
    );
}