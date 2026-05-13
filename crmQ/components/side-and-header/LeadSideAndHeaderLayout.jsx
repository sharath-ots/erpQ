"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    Box, Typography, Stack, IconButton,
    List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Divider
} from "@mui/material";
import { Icon as IconifyIcon } from "@iconify/react";
import { useLead } from "../../src/contexts/LeadContext";
import { mainDrawerWidth } from "../../src/lib/constants";

const HEADER_HEIGHT = 72;

const LeadSideBar = ({ isCollapsed, onToggleDesktop }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 🚀 LOGIC: Grab the lead context
    const {
        selectedDetailLeadId,
        setSelectedDetailLeadId,
        activeDetailTab,
        setActiveDetailTab,
        leadCounts
    } = useLead();

    const [activeNav, setActiveNav] = useState("All Leads");
    const [isInitialized, setIsInitialized] = useState(false);

    // 🚀 LOGIC: Parse filters from URL on load
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

    // 🚀 NAMES & LOGIC: Standard Navigation
    const navItems = [
        { label: "All Leads", count: leadCounts.all, icon: "material-symbols:analytics-outline", path: getFilterUrl([]) },
        { label: "New Leads", count: leadCounts.new, icon: "material-symbols:fiber-new-outline", path: getFilterUrl([{ field: 'status', operator: '=', value: 'New' }]) },
        { label: "Urgent Attention", count: leadCounts.urgent, icon: "material-symbols:warning-outline", path: getFilterUrl([[{ field: 'urgency', operator: 'in', value: 'Immediate, In 1 month' }, { field: 'custom_unreplied_email', operator: '=', value: '1' }]]) },
        { label: "Hot Leads", count: leadCounts.hot, icon: "material-symbols:local-fire-department-outline", path: getFilterUrl([[{ field: 'potential_volume', operator: 'in', value: '11-25 vehicle, 25+ vehicle' }, { field: 'conversion_potential', operator: 'in', value: '51 - 75%, 76 - 100%' }]]) },
        { label: "Archived", count: leadCounts.archived, icon: "material-symbols:archive-outline", path: getFilterUrl([{ field: 'status', operator: 'in', value: 'Lost Quotation, Do Not Contact, Completed, Hold' }]) },
    ];

    // 🚀 NAMES & LOGIC: Record Details (Visible when a lead is clicked)
    const detailMenuItems = [
        { id: 'Email', label: 'Email', icon: 'material-symbols:mail-outline' },
        { id: 'Task', label: 'Tasks', icon: 'material-symbols:check-box-outline' },
        { id: 'Event', label: 'Events', icon: 'material-symbols:calendar-today-outline' },
        { id: 'Notes', label: 'Notes', icon: 'material-symbols:notes' },
        { id: 'Activity', label: 'Activity', icon: 'material-symbols:history' }
    ];

    return (
        <Box
            sx={{
                height: '100%',
                width: {
                    xs: 260,
                    md: isCollapsed ? 160 : 260
                },
                transition: 'width 240ms cubic-bezier(0.4,0,0.2,1)',
                flexDirection: 'column',
                overflowX: 'hidden',
                backgroundColor: 'background.paper',
                position: 'relative',

                // 🚀 THE FIX: Hide on mobile main screen, but show on desktop
                display: { xs: 'none', md: 'flex' },

                // 🚀 THE FIX: If this component is inside the mobile Drawer, force it to display!
                '.MuiDrawer-paper &': {
                    display: 'flex'
                }
            }}
        >
            {/* ================= HEADER ================= */}
            <Box
                sx={{
                    minHeight: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: {
                        xs: 'space-between',
                        md: isCollapsed ? 'center' : 'space-between'
                    },
                    px: { xs: 2.5, md: isCollapsed ? 1.5 : 2.5 },
                    position: 'relative',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(145,158,171,0.12)'
                }}
            >
                <Stack
                    direction="row"
                    spacing={{ xs: 1.5, md: isCollapsed ? 0 : 1.5 }}
                    alignItems="center"
                    justifyContent={{
                        xs: 'flex-start',
                        md: isCollapsed ? 'center' : 'flex-start'
                    }}
                    sx={{ width: '100%' }}
                >
                    <Box
                        sx={{
                            width: { xs: 36, md: isCollapsed ? 56 : 36 },
                            height: { xs: 36, md: isCollapsed ? 56 : 36 },
                            borderRadius: { xs: 2, md: isCollapsed ? 3 : 2 },
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mx: { xs: 0, md: isCollapsed ? 'auto' : 0 },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <IconifyIcon
                            icon="material-symbols:leaderboard"
                            color="white"
                            fontSize={{ xs: '1.15rem', md: isCollapsed ? '1.35rem' : '1.15rem' }}
                        />
                    </Box>

                    <Typography
                        variant="h6"
                        sx={{
                            display: { xs: 'block', md: isCollapsed ? 'none' : 'block' },
                            fontWeight: 700,
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Leads
                    </Typography>
                </Stack>

                <IconButton
                    onClick={onToggleDesktop}
                    size="small"
                    sx={{
                        display: { xs: 'none', md: 'inline-flex' }, // Hide chevron entirely on mobile Drawer
                        width: 28,
                        height: 28,
                        position: isCollapsed ? 'absolute' : 'relative',
                        right: isCollapsed ? 8 : 0,
                        top: isCollapsed ? 22 : 'auto'
                    }}
                >
                    <IconifyIcon
                        icon={isCollapsed ? 'material-symbols:chevron-right' : 'material-symbols:chevron-left'}
                        fontSize={isCollapsed ? '1.45rem' : '1.1rem'}
                    />
                </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, pt: 2.5, pb: 3 }}>
                <Typography
                    variant="caption"
                    sx={{
                        display: { xs: 'block', md: isCollapsed ? 'none' : 'block' },
                        px: 1,
                        mb: 2,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'text.secondary'
                    }}
                >
                    {selectedDetailLeadId ? 'RECORD DETAILS' : 'NAVIGATION'}
                </Typography>

                {/* ================= BACK BUTTON ================= */}
                <ListItem
                    disablePadding
                    sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}
                >
                    <ListItemButton
                        component={selectedDetailLeadId ? 'div' : Link}
                        href={!selectedDetailLeadId ? (pathname.startsWith('/m/crmq') ? '/m/crmq' : '/crm') : undefined}
                        onClick={selectedDetailLeadId ? () => setSelectedDetailLeadId(null) : undefined}
                        sx={{
                            minHeight: { xs: 52, md: isCollapsed ? 72 : 52 },
                            width: '100%',
                            borderRadius: 3,
                            px: { xs: 1.5, md: isCollapsed ? 0 : 1.5 },
                            justifyContent: { xs: 'flex-start', md: isCollapsed ? 'center' : 'flex-start' },
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: { xs: 2, md: isCollapsed ? 0 : 2 },
                                width: { xs: 'auto', md: isCollapsed ? '100%' : 'auto' },
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: 'text.secondary'
                            }}
                        >
                            <IconifyIcon
                                icon={selectedDetailLeadId ? "material-symbols:arrow-back" : "material-symbols:home-outline"}
                                width={isCollapsed ? 24 : 22}
                                height={isCollapsed ? 24 : 22}
                            />
                        </ListItemIcon>

                        <ListItemText
                            primary={selectedDetailLeadId ? "Back to Lead List" : "Back to Home"}
                            sx={{ display: { xs: 'block', md: isCollapsed ? 'none' : 'block' } }}
                            primaryTypographyProps={{ noWrap: true, fontSize: '1rem' }}
                        />
                    </ListItemButton>
                </ListItem>

                <Divider sx={{ mb: 2, mx: 1, borderColor: 'rgba(145,158,171,0.12)' }} />

                <List sx={{ px: { xs: 1, md: isCollapsed ? 0 : 1 }, pb: 2, pt: 0 }}>
                    {selectedDetailLeadId ? (
                        /* 🚀 LOGIC: Show Email, Tasks, etc. when a lead is open */
                        detailMenuItems.map((item) => {
                            const isActive = activeDetailTab === item.id;
                            return (
                                <ListItem disablePadding key={item.id} sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
                                    <ListItemButton
                                        onClick={() => setActiveDetailTab(item.id)}
                                        sx={{
                                            minHeight: { xs: 52, md: isCollapsed ? 64 : 52 },
                                            width: '100%',
                                            borderRadius: 3,
                                            px: { xs: 1.5, md: isCollapsed ? 0 : 1.5 },
                                            justifyContent: { xs: 'flex-start', md: isCollapsed ? 'center' : 'flex-start' },
                                            bgcolor: 'transparent',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                mr: { xs: 2, md: isCollapsed ? 0 : 2 },
                                                justifyContent: 'center',
                                                color: 'text.secondary',
                                                display: 'flex',
                                                alignItems: 'center',
                                                width: { xs: 'auto', md: isCollapsed ? 56 : 'auto' }
                                            }}
                                        >
                                            <IconifyIcon
                                                icon={item.icon}
                                                width={isCollapsed ? 24 : 22}
                                                height={isCollapsed ? 24 : 22}
                                            />
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={item.label}
                                            sx={{ display: { xs: 'block', md: isCollapsed ? 'none' : 'block' } }}
                                            primaryTypographyProps={{ noWrap: true, fontSize: '1rem' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    ) : (
                        /* 🚀 LOGIC: Show standard filter list when no lead is open */
                        navItems.map((item) => {
                            const isActive = activeNav === item.label;
                            return (
                                <ListItem disablePadding key={item.label} sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.path}
                                        onClick={() => setActiveNav(item.label)}
                                        sx={{
                                            minHeight: { xs: 52, md: isCollapsed ? 72 : 52 },
                                            width: '100%',
                                            borderRadius: 3,
                                            px: { xs: 1.5, md: isCollapsed ? 0 : 1.5 },
                                            justifyContent: { xs: 'flex-start', md: isCollapsed ? 'center' : 'flex-start' },
                                            bgcolor: isActive ? 'action.selected' : 'transparent',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                mr: { xs: 2, md: isCollapsed ? 0 : 2 },
                                                width: { xs: 'auto', md: isCollapsed ? '100%' : 'auto' },
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                color: isActive ? 'primary.main' : 'text.secondary'
                                            }}
                                        >
                                            <IconifyIcon
                                                icon={item.icon}
                                                width={isCollapsed ? 24 : 22}
                                                height={isCollapsed ? 24 : 22}
                                            />
                                        </ListItemIcon>

                                        <Box
                                            sx={{
                                                display: { xs: 'flex', md: isCollapsed ? 'none' : 'flex' },
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <ListItemText
                                                primary={item.label}
                                                primaryTypographyProps={{
                                                    fontSize: '0.98rem',
                                                    fontWeight: isActive ? 600 : 500,
                                                    noWrap: true
                                                }}
                                            />
                                            {item.count > 0 && (
                                                <Box
                                                    sx={{
                                                        minWidth: 22,
                                                        height: 22,
                                                        px: 0.75,
                                                        borderRadius: 999,
                                                        bgcolor: 'action.hover',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        color: 'text.secondary'
                                                    }}
                                                >
                                                    {item.count}
                                                </Box>
                                            )}
                                        </Box>
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

export default LeadSideBar;