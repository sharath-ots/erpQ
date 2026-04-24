import React, { useState } from 'react';
import {
    Box, Stack, Typography, Button, List, ListItemButton,
    ListItemIcon, ListItemText, Divider, IconButton
} from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';

// --- PLACEHOLDER COMPONENTS FOR YOUR TABS ---
// You will replace these with your actual imported components
const ActivityFeed = () => <Typography variant="body2" color="text.secondary">Activity Timeline goes here...</Typography>;
const EmailFeed = () => <Typography variant="body2" color="text.secondary">Email History goes here...</Typography>;
const TaskList = () => <Typography variant="body2" color="text.secondary">Upcoming Tasks go here...</Typography>;
const EventList = () => <Typography variant="body2" color="text.secondary">Scheduled Events go here...</Typography>;
const NotesSection = () => <Typography variant="body2" color="text.secondary">Internal Notes go here...</Typography>;

export default function ActivityTabSidebar({ leadId }) {
    // State to track which vertical tab is currently selected
    const [activeTab, setActiveTab] = useState('Activity');

    // Define the tabs for the left side menu
    const menuItems = [
        { id: 'Activity', label: 'Activity', icon: 'material-symbols:history' },
        { id: 'Email', label: 'Email', icon: 'material-symbols:mail-outline' },
        { id: 'Task', label: 'Tasks', icon: 'material-symbols:check-box-outline' },
        { id: 'Event', label: 'Events', icon: 'material-symbols:calendar-today-outline' },
        { id: 'Notes', label: 'Notes', icon: 'material-symbols:notes' },
    ];

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'white',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
        }}>
            {/* --- TOP HEADER (Matches your first screenshot) --- */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}
            >
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    {leadId} {/* Ideally, you pass down the Lead Name here too! */}
                </Typography>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<IconifyIcon icon="material-symbols:edit-outline" />}
                        sx={{ fontWeight: 600, borderRadius: 1.5, borderColor: '#cbd5e1', color: '#475569' }}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600, borderRadius: 1.5, boxShadow: 'none' }}
                    >
                        View Full Details
                    </Button>
                </Stack>
            </Stack>

            {/* --- MAIN CONTENT SPLIT (Matches your wireframe) --- */}
            <Stack direction="row" sx={{ flexGrow: 1, overflow: 'hidden' }}>

                {/* LEFT LOCAL SIDEBAR (The Navigation) */}
                <Box sx={{
                    width: 220,
                    flexShrink: 0,
                    borderRight: '1px solid #e2e8f0',
                    bgcolor: '#f8fafc',
                    p: 1.5,
                    overflowY: 'auto'
                }}>
                    <List sx={{ p: 0 }}>
                        {menuItems.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <ListItemButton
                                    key={item.id}
                                    selected={isActive}
                                    onClick={() => setActiveTab(item.id)}
                                    sx={{
                                        borderRadius: 1.5,
                                        mb: 0.5,
                                        py: 1,
                                        px: 2,
                                        bgcolor: isActive ? '#eff6ff' : 'transparent',
                                        '&:hover': { bgcolor: isActive ? '#eff6ff' : '#f1f5f9' },
                                        '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#e0f2fe' } }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#3b82f6' : '#64748b' }}>
                                        <IconifyIcon icon={item.icon} fontSize="1.2rem" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontSize: '0.875rem',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#1e293b' : '#475569'
                                        }}
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Box>

                {/* RIGHT CONTENT AREA (Dynamically renders based on selection) */}
                <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', bgcolor: 'white' }}>

                    {/* Header for the specific tab */}
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#334155' }}>
                        {menuItems.find(m => m.id === activeTab)?.label}
                    </Typography>

                    {/* Render the appropriate component */}
                    {activeTab === 'Activity' && <ActivityFeed />}
                    {activeTab === 'Email' && <EmailFeed />}
                    {activeTab === 'Task' && <TaskList />}
                    {activeTab === 'Event' && <EventList />}
                    {activeTab === 'Notes' && <NotesSection />}

                </Box>
            </Stack>
        </Box>
    );
}