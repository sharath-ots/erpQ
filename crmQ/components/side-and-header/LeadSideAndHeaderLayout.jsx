"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
    Box, Drawer, AppBar, Toolbar, Typography, Stack, InputBase,
    IconButton, Avatar, Badge, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Divider, useTheme
} from "@mui/material";

import { Icon as IconifyIcon } from "@iconify/react";
import { LeadProvider, useLead } from "../../src/contexts/LeadContext";
import { useSettingsContext } from '../../src/providers/SettingsProvider';

const COLLAPSED_WIDTH = 80;
const HEADER_HEIGHT = 80;

const LeadSideBar = ({ isCollapsed, onToggleDesktop }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { selectedDetailLeadId, setSelectedDetailLeadId, activeDetailTab, setActiveDetailTab, leadCounts } = useLead();

    const [activeNav, setActiveNav] = useState("All Leads");
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            const filters = searchParams.get('filters');
            if (filters) {
                if (filters.includes('"value":"New"')) setActiveNav("New Leads");
                else if (filters.includes('"field":"urgency"')) setActiveNav("Urgent Attention");
                else if (filters.includes('"field":"potential_volume"')) setActiveNav("Hot Leads");
                else if (filters.includes('Lost Quotation') || filters.includes('Do Not Contact')) setActiveNav("Archived");
            }
            setIsInitialized(true);
        }
    }, [searchParams, isInitialized]);

    const getFilterUrl = (filterRules) => {
        const basePath = pathname.startsWith('/m/crmq') ? '/m/crmq/list/Lead' : '/crm/lead-list';
        return `${basePath}?filters=${encodeURIComponent(JSON.stringify(filterRules))}`;
    };

    const navItems = [
        { label: "All Leads", count: leadCounts.all, icon: "material-symbols:analytics-outline", path: getFilterUrl([]) },
        { label: "New Leads", count: leadCounts.new, icon: "material-symbols:fiber-new-outline", path: getFilterUrl([{ field: 'status', operator: '=', value: 'New' }]) },
        { label: "Urgent Attention", count: leadCounts.urgent, icon: "material-symbols:warning-outline", path: getFilterUrl([[{ field: 'urgency', operator: 'in', value: 'Immediate, In 1 month' }, { field: 'custom_unreplied_email', operator: '=', value: '1' }]]) },
        { label: "Hot Leads", count: leadCounts.hot, icon: "material-symbols:local-fire-department-outline", path: getFilterUrl([[{ field: 'potential_volume', operator: 'in', value: '11-25 vehicle, 25+ vehicle' }, { field: 'conversion_potential', operator: 'in', value: '51 - 75%, 76 - 100%' }]]) },
        { label: "Archived", count: leadCounts.archived, icon: "material-symbols:archive-outline", path: getFilterUrl([{ field: 'status', operator: 'in', value: 'Lost Quotation, Do Not Contact, Completed, Hold' }]) },
    ];

    const detailMenuItems = [
        { id: 'Email', label: 'Email', icon: 'material-symbols:mail-outline' },
        { id: 'Task', label: 'Tasks', icon: 'material-symbols:check-box-outline' },
        { id: 'Event', label: 'Events', icon: 'material-symbols:calendar-today-outline' },
        { id: 'Notes', label: 'Notes', icon: 'material-symbols:notes' },
        { id: 'Activity', label: 'Activity', icon: 'material-symbols:history' }
    ];

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper", borderRight: 1, borderColor: "divider", overflowX: "hidden" }}>

            <Box sx={{ minHeight: HEADER_HEIGHT, display: "flex", alignItems: "center", px: isCollapsed ? 0 : 3, justifyContent: isCollapsed ? "center" : "space-between", borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ display: isCollapsed ? 'none' : 'flex' }}>
                    <Box sx={{ width: 32, height: 32, bgcolor: "primary.main", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: 2 }}>
                        <IconifyIcon icon="material-symbols:leaderboard" color="white" fontSize="1.2rem" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}>Leads</Typography>
                </Stack>
                <IconButton onClick={onToggleDesktop} size="small" sx={{ color: "text.secondary", display: { xs: "none", md: "flex" }, transition: "all 0.2s", "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}>
                    <IconifyIcon icon={isCollapsed ? "material-symbols:chevron-right" : "material-symbols:chevron-left"} fontSize="1.5rem" />
                </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", px: isCollapsed ? 1 : 2, py: 3 }}>

                {!isCollapsed && (
                    <Typography variant="overline" sx={{ px: 2, color: "text.secondary", fontWeight: 700, letterSpacing: 1, mb: 1, display: "block" }}>
                        {selectedDetailLeadId ? "RECORD DETAILS" : "NAVIGATION"}
                    </Typography>
                )}

                <ListItem disablePadding sx={{ mb: 2 }}>
                    {selectedDetailLeadId ? (
                        <ListItemButton
                            onClick={() => setSelectedDetailLeadId(null)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: 'text.secondary' }}>
                                <IconifyIcon icon="material-symbols:arrow-back" fontSize="1.25rem" />
                            </ListItemIcon>
                            {!isCollapsed && <ListItemText primary="Back to Lead List" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600, color: 'text.primary' }} />}
                        </ListItemButton>
                    ) : (
                        <ListItemButton
                            component={Link}
                            href={pathname.startsWith('/m/crmq') ? '/m/crmq' : '/crm'}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: 'text.secondary' }}>
                                <IconifyIcon icon="material-symbols:home-outline" fontSize="1.25rem" />
                            </ListItemIcon>
                            {!isCollapsed && <ListItemText primary="Back to Home" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600, color: 'text.primary' }} />}
                        </ListItemButton>
                    )}
                </ListItem>

                <Divider sx={{ mb: 2 }} />

                <List sx={{ p: 0 }}>
                    {selectedDetailLeadId ? (
                        detailMenuItems.map((item) => {
                            const isActive = activeDetailTab === item.id;
                            return (
                                <ListItem disablePadding key={item.id} sx={{ mb: 0.5 }}>
                                    <ListItemButton onClick={() => setActiveDetailTab(item.id)} sx={{
                                        borderRadius: 2,
                                        bgcolor: isActive ? "action.selected" : "transparent",
                                        transition: "all 0.2s ease-in-out",
                                        justifyContent: isCollapsed ? "center" : "flex-start",
                                        px: isCollapsed ? 0 : 2, py: 1.25,
                                        borderLeft: isActive && !isCollapsed ? "3px solid" : "3px solid transparent",
                                        borderColor: isActive ? "primary.main" : "transparent",
                                        "&:hover": { bgcolor: "action.hover" }
                                    }}>
                                        <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: isActive ? "primary.main" : "text.secondary" }}><IconifyIcon icon={item.icon} fontSize="1.25rem" /></ListItemIcon>
                                        {!isCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isActive ? 700 : 500, color: isActive ? "primary.main" : "text.primary" }} />}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    ) : (
                        navItems.map((item) => {
                            const isActive = activeNav === item.label;

                            return (
                                <ListItem disablePadding key={item.label} sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.path}
                                        onClick={() => setActiveNav(item.label)}
                                        sx={{
                                            borderRadius: 1.5,
                                            bgcolor: isActive ? "action.selected" : "transparent",
                                            transition: "all 0.2s ease-in-out",
                                            justifyContent: isCollapsed ? "center" : "flex-start",
                                            px: isCollapsed ? 0 : 2, py: 1.25,
                                            borderLeft: isActive && !isCollapsed ? "3px solid" : "3px solid transparent",
                                            borderColor: isActive ? "primary.main" : "transparent",
                                            "&:hover": { bgcolor: "action.hover" }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: isActive ? "primary.main" : "text.secondary" }}>
                                            <IconifyIcon icon={item.icon} fontSize="1.25rem" />
                                        </ListItemIcon>
                                        {!isCollapsed && (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <ListItemText
                                                    primary={item.label}
                                                    primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isActive ? 700 : 500, color: isActive ? "primary.main" : "text.primary" }}
                                                />
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        bgcolor: isActive ? 'primary.main' : 'action.hover',
                                                        color: isActive ? 'primary.contrastText' : 'text.secondary',
                                                        px: 1, py: 0.2, borderRadius: 2, fontWeight: 700
                                                    }}
                                                >
                                                    {item.count || 0}
                                                </Typography>
                                            </Box>
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    )}
                </List>
            </Box>
        </Box>
    );
};

export default function LeadSideAndHeaderLayout({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const handleDesktopToggle = () => setIsCollapsed(!isCollapsed);

    // 🚀 FIX: Safely read config with optional chaining so it doesn't crash on mount!
    const { config } = useSettingsContext() || {};
    const DRAWER_WIDTH = config?.drawerWidth || 280;

    const currentDrawerWidth = isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

    return (
        <LeadProvider>
            <Box sx={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>

                <Box component="nav" sx={{ width: { md: currentDrawerWidth }, flexShrink: 0, transition: "width 0.3s ease-in-out", zIndex: 1200, borderRight: 1, borderColor: "divider", bgcolor: "background.paper", display: { xs: "none", md: "block" } }}>
                    <LeadSideBar isCollapsed={isCollapsed} onToggleDesktop={handleDesktopToggle} />
                </Box>

                <Box component="main" sx={{ flex: 1, minWidth: 0, p: 0, height: "100vh", overflow: "hidden", transition: "all 0.3s ease-in-out", display: 'flex', flexDirection: 'column' }}>

                    <Box sx={{ minHeight: `${HEADER_HEIGHT}px`, flexShrink: 0, width: '100%' }} />

                    {/* 🚀 FIX: Added display flex and minHeight 0 here so the table inside knows exactly how tall it's allowed to be! */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {children}
                    </Box>
                </Box>

            </Box>
        </LeadProvider>
    );
}