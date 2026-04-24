"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
    Box, Drawer, AppBar, Toolbar, Typography, Stack, InputBase,
    IconButton, Avatar, Badge, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Divider
} from "@mui/material";

import { Icon as IconifyIcon } from "@iconify/react";
import { LeadProvider, useLead } from "../../src/contexts/LeadContext";

const DRAWER_WIDTH = 200;
const COLLAPSED_WIDTH = 80;

const LeadSideBar = ({ isCollapsed, onToggleDesktop }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { selectedDetailLeadId, setSelectedDetailLeadId, activeDetailTab, setActiveDetailTab } = useLead();

    // 🚀 EXPERT FIX: Local state to lock in the highlight when clicked
    const [activeNav, setActiveNav] = useState("All Leads");
    const [isInitialized, setIsInitialized] = useState(false);

    // Read the URL once on mount (e.g., if you came from a Dashboard Card)
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
        return `/crm/lead-list?filters=${encodeURIComponent(JSON.stringify(filterRules))}`;
    };

    const navItems = [
        { label: "All Leads", icon: "material-symbols:analytics-outline", path: getFilterUrl([]) },
        { label: "New Leads", icon: "material-symbols:fiber-new-outline", path: getFilterUrl([{ field: 'status', operator: '=', value: 'New' }]) },
        { label: "Urgent Attention", icon: "material-symbols:warning-outline", path: getFilterUrl([[{ field: 'urgency', operator: 'in', value: 'Immediate, In 1 month' }, { field: 'custom_unreplied_email', operator: '=', value: '1' }]]) },
        { label: "Hot Leads", icon: "material-symbols:local-fire-department-outline", path: getFilterUrl([[{ field: 'potential_volume', operator: 'in', value: '11-25 vehicle, 25+ vehicle' }, { field: 'conversion_potential', operator: 'in', value: '51 - 75%, 76 - 100%' }]]) },
        { label: "Archived", icon: "material-symbols:archive-outline", path: getFilterUrl([{ field: 'status', operator: 'in', value: 'Lost Quotation, Do Not Contact, Completed, Hold' }]) },
    ];

    const detailMenuItems = [
        { id: 'Email', label: 'Email', icon: 'material-symbols:mail-outline' },
        { id: 'Task', label: 'Tasks', icon: 'material-symbols:check-box-outline' },
        { id: 'Event', label: 'Events', icon: 'material-symbols:calendar-today-outline' },
        { id: 'Notes', label: 'Notes', icon: 'material-symbols:notes' },
        { id: 'Activity', label: 'Activity', icon: 'material-symbols:history' }
    ];

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#ffffff", borderRight: "1px solid #e2e8f0", overflowX: "hidden" }}>

            {/* BRANDING HEADER */}
            <Box sx={{ minHeight: 70, display: "flex", alignItems: "center", px: isCollapsed ? 0 : 3, justifyContent: isCollapsed ? "center" : "space-between", borderBottom: "1px solid #f1f5f9" }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ display: isCollapsed ? 'none' : 'flex' }}>
                    <Box sx={{ width: 32, height: 32, bgcolor: "#2563eb", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" }}>
                        <IconifyIcon icon="material-symbols:leaderboard" color="white" fontSize="1.2rem" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>Leads</Typography>
                </Stack>
                <IconButton onClick={onToggleDesktop} size="small" sx={{ color: "#94a3b8", display: { xs: "none", md: "flex" }, transition: "all 0.2s", "&:hover": { color: "#0f172a", bgcolor: "#f1f5f9" } }}>
                    <IconifyIcon icon={isCollapsed ? "material-symbols:chevron-right" : "material-symbols:chevron-left"} fontSize="1.5rem" />
                </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", px: isCollapsed ? 1 : 2, py: 3 }}>

                {/* SECTION DIVIDER */}
                {!isCollapsed && (
                    <Typography variant="overline" sx={{ px: 2, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, mb: 1, display: "block" }}>
                        {selectedDetailLeadId ? "RECORD DETAILS" : "NAVIGATION"}
                    </Typography>
                )}

                {/* DYNAMIC BACK BUTTON */}
                <ListItem disablePadding sx={{ mb: 2 }}>
                    {selectedDetailLeadId ? (
                        <ListItemButton
                            onClick={() => setSelectedDetailLeadId(null)}
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', transition: 'all 0.2s', '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: '#475569' }}>
                                <IconifyIcon icon="material-symbols:arrow-back" fontSize="1.25rem" />
                            </ListItemIcon>
                            {!isCollapsed && <ListItemText primary="Back to Lead List" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600, color: '#334155' }} />}
                        </ListItemButton>
                    ) : (
                        <ListItemButton
                            component="a"
                            href="http://cityqerp.ortusolis.in:3005/crm" // 🚀 Updated to break out back to main portal
                            sx={{ borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', transition: 'all 0.2s', '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: '#475569' }}>
                                <IconifyIcon icon="material-symbols:home-outline" fontSize="1.25rem" />
                            </ListItemIcon>
                            {!isCollapsed && <ListItemText primary="Back to Home" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600, color: '#334155' }} />}
                        </ListItemButton>
                    )}
                </ListItem>

                <Divider sx={{ mb: 2, borderColor: '#f1f5f9' }} />

                <List sx={{ p: 0 }}>
                    {selectedDetailLeadId ? (
                        /* Detail Menu */
                        detailMenuItems.map((item) => {
                            const isActive = activeDetailTab === item.id;
                            return (
                                <ListItem disablePadding key={item.id} sx={{ mb: 0.5 }}>
                                    <ListItemButton onClick={() => setActiveDetailTab(item.id)} sx={{
                                        borderRadius: 2,
                                        bgcolor: isActive ? "#eff6ff" : "transparent",
                                        transition: "all 0.2s ease-in-out",
                                        justifyContent: isCollapsed ? "center" : "flex-start",
                                        px: isCollapsed ? 0 : 2, py: 1.25,
                                        borderLeft: isActive && !isCollapsed ? "3px solid #2563eb" : "3px solid transparent",
                                        "&:hover": { bgcolor: isActive ? "#eff6ff" : "#f1f5f9" }
                                    }}>
                                        <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: isActive ? "#2563eb" : "#64748b" }}><IconifyIcon icon={item.icon} fontSize="1.25rem" /></ListItemIcon>
                                        {!isCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#1d4ed8" : "#475569" }} />}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    ) : (
                        /* Main Nav Menu */
                        navItems.map((item) => {
                            // 🚀 EXPERT FIX: Check state directly
                            const isActive = activeNav === item.label;

                            return (
                                <ListItem disablePadding key={item.label} sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.path}
                                        onClick={() => setActiveNav(item.label)} // 🚀 INSTANT HIGHLIGHT ON CLICK
                                        sx={{
                                            borderRadius: 1.5,
                                            bgcolor: isActive ? "#eff6ff" : "transparent",
                                            transition: "all 0.2s ease-in-out",
                                            justifyContent: isCollapsed ? "center" : "flex-start",
                                            px: isCollapsed ? 0 : 2, py: 1.25,
                                            borderLeft: isActive && !isCollapsed ? "3px solid #2563eb" : "3px solid transparent",
                                            "&:hover": { bgcolor: isActive ? "#eff6ff" : "#f1f5f9" }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 1.5, color: isActive ? "#2563eb" : "#64748b" }}>
                                            <IconifyIcon icon={item.icon} fontSize="1.25rem" />
                                        </ListItemIcon>
                                        {!isCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#1d4ed8" : "#475569" }} />}
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


const LeadTopBar = ({ onToggleMobile, onToggleDesktop, isCollapsed }) => {
    const currentDrawerWidth = isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { md: `calc(100% - ${currentDrawerWidth}px)` },
                ml: { md: `${currentDrawerWidth}px` },
                bgcolor: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
                borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
                color: "text.primary",
                transition: "width 0.3s ease-in-out, margin 0.3s ease-in-out",
            }}
        >
            <Toolbar sx={{ minHeight: "70px", px: { xs: 2, md: 4 }, justifyContent: "space-between" }}>

                <Stack direction="row" alignItems="center">
                    <IconButton color="inherit" edge="start" onClick={onToggleMobile} sx={{ mr: 2, display: { md: "none" } }}>
                        <IconifyIcon icon="material-symbols:menu" />
                    </IconButton>

                    <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", bgcolor: "#f1f5f9", borderRadius: 2, px: 2, py: 1, width: "100%", minWidth: 300, maxWidth: 450, transition: "all 0.2s ease-in-out", border: "1px solid transparent", "&:hover": { bgcolor: "#e2e8f0" }, "&:focus-within": { bgcolor: "#ffffff", border: "1px solid #cbd5e1", boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)" } }}>
                        <IconifyIcon icon="material-symbols:search" color="#64748b" fontSize="1.2rem" />
                        <InputBase placeholder="Search leads, organizations..." sx={{ ml: 1.5, flex: 1, fontSize: "0.875rem", color: "#0f172a", fontWeight: 500 }} />
                    </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2.5}>
                    <IconButton sx={{ border: "1px solid #e2e8f0", bgcolor: "#ffffff", transition: "all 0.2s", "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1", transform: "translateY(-1px)", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" } }}>
                        <Badge badgeContent="" color="error" variant="dot">
                            <IconifyIcon icon="material-symbols:notifications-outline" fontSize="1.2rem" color="#475569" />
                        </Badge>
                    </IconButton>

                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        sx={{ "& .MuiBadge-badge": { backgroundColor: "#10b981", color: "#10b981", boxShadow: "0 0 0 2px white" } }}
                    >
                        <Avatar sx={{ width: 40, height: 40, cursor: "pointer", border: "2px solid #ffffff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.2s", "&:hover": { transform: "scale(1.05)", boxShadow: "0 4px 6px rgba(0,0,0,0.15)" } }} />
                    </Badge>
                </Stack>
            </Toolbar>
        </AppBar>
    );
};

export default function LeadSideAndHeaderLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleMobileToggle = () => setMobileOpen(!mobileOpen);
    const handleDesktopToggle = () => setIsCollapsed(!isCollapsed);

    const currentDrawerWidth = isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

    return (
        <LeadProvider>
            <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "#f8fafc" }}>

                <LeadTopBar onToggleMobile={handleMobileToggle} onToggleDesktop={handleDesktopToggle} isCollapsed={isCollapsed} />

                <Box component="nav" sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 }, transition: "width 0.3s ease-in-out", zIndex: 1200 }}>
                    <Drawer variant="temporary" open={mobileOpen} onClose={handleMobileToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, borderRight: "none" } }}>
                        <LeadSideBar isCollapsed={false} onToggleDesktop={handleDesktopToggle} />
                    </Drawer>
                    <Drawer variant="permanent" open sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: currentDrawerWidth, borderRight: "none", transition: "width 0.3s ease-in-out", overflowX: "hidden" } }}>
                        <LeadSideBar isCollapsed={isCollapsed} onToggleDesktop={handleDesktopToggle} />
                    </Drawer>
                </Box>

                <Box component="main" sx={{ flexGrow: 1, p: 0, width: { md: `calc(100% - ${currentDrawerWidth}px)` }, mt: "70px", height: "calc(100vh - 70px)", overflowY: "auto", overflowX: "hidden", transition: "width 0.3s ease-in-out" }}>
                    {children}
                </Box>
            </Box>
        </LeadProvider>
    );
}