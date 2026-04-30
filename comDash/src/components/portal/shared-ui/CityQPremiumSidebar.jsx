"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Box,
    Drawer,
    IconButton,
    List,
    Toolbar,
    useTheme,
    useMediaQuery
} from "@mui/material";
import IconifyIcon from "components/base/IconifyIcon";
import SidenavSimpleBar from "layouts/main-layout/sidenav/SidenavSimpleBar";
import { useSettingsContext } from "providers/SettingsProvider";
import { useNavContext } from "layouts/main-layout/NavProvider";
import { usePortalMenu } from "./PortalMenuContext";
import NavItem from "layouts/main-layout/sidenav/NavItem";
import CityQLogo from "./CityQLogo";

// --- CONSTANTS FOR PERFECT SIZING ---
const DRAWER_WIDTH = {
    expanded: 300,
    collapsed: 136, // The premium Aurora compressed size
};

// ==========================================
// 1. YOUR EXACT DATA MAPPING & SORTING LOGIC
// ==========================================
function safePathName(v) {
    return String(v ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// --- 1. THE BULLETPROOF ICON GUESSER ---
function guessIcon(node, hasChildren) {
    // 1. Explicit icon from database overrides everything
    if (node?.icon && typeof node.icon === 'string' && node.icon.trim() !== '') {
        return node.icon;
    }

    // Combine all strings (labels, paths, keys) to search through
    const searchString = `${node?.label || ''} ${node?.name || ''} ${node?.title || ''} ${node?.path || ''} ${node?.key || ''}`.toLowerCase();

    // ==========================================
    // 2. SPECIFIC LEAF ROUTES MUST GO FIRST!
    // (This prevents "crm" in the URL from swallowing all the children)
    // ==========================================
    if (searchString.includes("dashboard")) return "material-symbols:dashboard-outline-rounded";
    if (searchString.includes("add lead") || searchString.includes("new lead")) return "material-symbols:person-add-outline-rounded";
    if (searchString.includes("lead")) return "material-symbols:person-search-outline-rounded";
    if (searchString.includes("opportunit")) return "material-symbols:trending-up-rounded";
    if (searchString.includes("customer")) return "material-symbols:storefront-outline-rounded";
    if (searchString.includes("contact")) return "material-symbols:contacts-outline-rounded";
    if (searchString.includes("quotation") || searchString.includes("quote")) return "material-symbols:request-quote-outline-rounded";
    if (searchString.includes("other") || searchString.includes("doctype")) return "material-symbols:category-outline-rounded";

    if (searchString.includes("erpnext ui")) return "material-symbols:open-in-new-rounded";
    if (searchString.includes("erpnext") || searchString.includes("desk") || searchString.includes("iframe")) return "material-symbols:desktop-windows-outline-rounded";

    if (searchString.includes("core") || searchString.includes("setting")) return "material-symbols:settings-outline-rounded";
    if (searchString.includes("auth") || searchString.includes("login")) return "material-symbols:security-rounded";

    // ==========================================
    // 3. TOP LEVEL MODULES GO LAST
    // ==========================================
    // Changed from headset/mic to a professional briefcase!
    if (searchString.includes("crm")) return "material-symbols:business-center-outline-rounded";

    if (searchString.includes("hr") || searchString.includes("human resource")) return "material-symbols:badge-outline-rounded";
    if (searchString.includes("purchas") || searchString.includes("pur portal")) return "material-symbols:shopping-cart-outline-rounded";

    // ==========================================
    // 4. ULTIMATE FALLBACKS
    // ==========================================
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
        // Force the icon guesser to evaluate the current node's properties
        icon: guessIcon(node, hasChildren),
        active: node?.active !== false,
        selectionPrefix: typeof node?.selectionPrefix === "string" ? node.selectionPrefix : undefined,
    };

    if (hasChildren) {
        return {
            ...base,
            // Recursively map children, passing the parent path for unique keys
            items: children.map((c, i) => toAuroraItem(c, i, pathName)),
        };
    }
    return base;
}

// ==========================================
// 2. THE PREMIUM LAYOUT WRAPPER
// ==========================================
export default function CityQPremiumSidebar() {
    const { menuItems } = usePortalMenu();
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const {
        config: { sidenavCollapsed, openNavbarDrawer, navigationMenuType },
        setConfig,
        toggleNavbarCollapse
    } = useSettingsContext();

    const { sidenavAppbarVariant } = useNavContext();

    const currentWidth = sidenavCollapsed ? DRAWER_WIDTH.collapsed : DRAWER_WIDTH.expanded;

    // Smooth CSS Transition for the buttery slide effect
    const smoothTransition = theme.transitions.create(['width', 'transform'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.standard,
    });

    const toggleNavbarDrawer = () => {
        setConfig({ openNavbarDrawer: !openNavbarDrawer });
    };

    const orderedMenuItems = useMemo(() => {
        const list = Array.isArray(menuItems) ? menuItems : [];
        const rank = (node) => {
            const key = String(node?.label ?? node?.key ?? node?.path ?? "").toLowerCase();
            if (key.includes("crm")) return 10;
            if (key.includes("hr")) return 20;
            if (key.includes("pur") || key.includes("purchase")) return 30;
            if (key.includes("erpnext") && key.includes("full")) return 1000;
            return 100;
        };
        return list
            .map((n, i) => ({ n, i, r: rank(n) }))
            .sort((a, b) => (a.r - b.r) || (a.i - b.i))
            .map((x) => x.n);
    }, [menuItems]);

    // --- THE CONTENT INSIDE THE DRAWER ---
    const DrawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* HEADER & LOGO */}
            <Toolbar variant={sidenavAppbarVariant} sx={{ display: "block", px: { xs: 0 }, transition: smoothTransition }}>
                <Box
                    sx={[
                        { height: 1, display: "flex", justifyContent: "space-between", alignItems: "center" },
                        sidenavCollapsed && { justifyContent: "center" },
                        !sidenavCollapsed && { pl: { xs: 2, md: 3 }, pr: { xs: 1, md: 1.5 } },
                    ]}
                >
                    {(navigationMenuType === "sidenav" || !isDesktop) && (
                        <>
                            <CityQLogo showName={!sidenavCollapsed} />
                            <IconButton sx={{ mt: 1, display: { md: "none" } }} onClick={toggleNavbarDrawer}>
                                <IconifyIcon icon="material-symbols:left-panel-close-outline" fontSize={20} />
                            </IconButton>
                        </>
                    )}
                </Box>
            </Toolbar>

            {/* MENU LIST */}
            <Box sx={{ flex: 1, overflow: "hidden" }}>
                <SidenavSimpleBar>
                    <Box sx={[{ py: 1 }, sidenavCollapsed ? { px: 1 } : { px: { xs: 1, md: 2 } }]}>
                        <List
                            dense
                            sx={{
                                pb: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,

                                // Base button container
                                '& .MuiListItemButton-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.2s ease',

                                    // 🚀 DYNAMIC LAYOUT: Stack vertically when collapsed, horizontal row when expanded
                                    ...(sidenavCollapsed ? {
                                        minHeight: 72,
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        px: 1,
                                    } : {
                                        minHeight: 44,
                                        px: 1.5,
                                        flexDirection: 'row',         // Ensure standard horizontal layout
                                        justifyContent: 'flex-start', // Force left alignment for the whole row
                                        alignItems: 'center',
                                    })
                                },

                                // 1. Text alignment and sizing
                                '& .MuiTypography-root': {
                                    fontSize: sidenavCollapsed ? '0.75rem !important' : '0.9375rem !important',
                                    fontWeight: '500 !important',
                                    lineHeight: 1.5,
                                    // 🚀 THE FIX: Center when collapsed, Left when expanded!
                                    textAlign: sidenavCollapsed ? 'center' : 'left',
                                    width: sidenavCollapsed ? '100%' : 'auto', // Only take full width to center when collapsed
                                },

                                // 2. Icon Container alignment
                                '& .MuiListItemIcon-root': {
                                    color: 'text.secondary',

                                    ...(sidenavCollapsed ? {
                                        minWidth: 'auto !important',
                                        marginRight: '0 !important',
                                        marginBottom: '4px', // Space between icon and text when stacked
                                        justifyContent: 'center',
                                    } : {
                                        minWidth: '36px !important',
                                        marginRight: '0 !important',
                                        marginBottom: '0 !important',
                                        justifyContent: 'flex-start',
                                    }),
                                    '& iconify-icon, & svg': {
                                        fontSize: '22px !important',
                                    }
                                },

                                // 3. Hide the tiny arrow (chevron) ONLY in collapsed mode
                                ...(sidenavCollapsed && {
                                    '& .MuiListItemSecondaryAction-root, & [class*="chevron"], & iconify-icon[icon*="chevron"], & svg[data-testid*="Chevron"]': {
                                        display: 'none !important',
                                    }
                                }),

                                // 4. Active/Selected State
                                '& .MuiListItemButton-root.Mui-selected': {
                                    bgcolor: '#eff6ff !important',
                                    '&:hover': { bgcolor: '#e0f2fe !important' },
                                    '& .MuiListItemIcon-root': { color: '#3b82f6 !important' },
                                    '& .MuiTypography-root': {
                                        color: '#3b82f6 !important',
                                        fontWeight: '600 !important'
                                    }
                                }
                            }}
                        >
                            {orderedMenuItems.map((node, idx) => {
                                const item = toAuroraItem(node, idx);
                                if (item.path === "#" && pathname === "/") item.path = "/";

                                return <NavItem key={item.pathName} item={item} level={0} />;
                            })}
                        </List>
                    </Box>
                </SidenavSimpleBar>
            </Box>
        </Box>
    );

    return (
        <Box component="nav" className="default-sidenav" sx={{ width: { md: currentWidth }, flexShrink: { sm: 0 }, transition: smoothTransition, position: { md: 'absolute', lg: 'static' } }}>

            {/* MOBILE DRAWER */}
            <Drawer
                variant="temporary"
                open={openNavbarDrawer}
                onClose={toggleNavbarDrawer}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH.expanded, borderRight: 'none' },
                }}
            >
                {DrawerContent}
            </Drawer>

            {/* DESKTOP DRAWER */}
            <Drawer
                variant="permanent"
                open
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    '& .MuiDrawer-paper': {
                        overflow: 'visible', // CRITICAL for popout menus to work!
                        boxSizing: 'border-box',
                        width: currentWidth,
                        border: 0,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        transition: smoothTransition,
                    },
                }}
            >
                {DrawerContent}

                {/* FLOATING COLLAPSE BUTTON */}
                <Box
                    onClick={toggleNavbarCollapse || (() => setConfig({ sidenavCollapsed: !sidenavCollapsed }))}
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
                        icon={sidenavCollapsed ? "material-symbols:chevron-right-rounded" : "material-symbols:chevron-left-rounded"}
                        color="text.secondary"
                    />
                </Box>
            </Drawer>
        </Box>
    );
}