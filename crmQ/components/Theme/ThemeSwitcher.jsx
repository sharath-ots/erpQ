'use client';

import { useState } from 'react';
import {
    Box, Menu, MenuItem, Tooltip, ListItemIcon, ListItemText,
    Fab, Typography, Divider, Radio, Stack, Grid
} from '@mui/material';
import { useThemeMode } from '@/shared-ui/hooks/useThemeMode';
import { useSettingsContext } from '@/shared-ui/providers/SettingsProvider';
import { IconifyIcon } from '@/shared-ui/components/base/IconifyIcon';
import { COLOR_GROUPS } from '@/shared-ui/theme/primaryColorOverride';
import { SET_PRIMARY_COLOR } from '@/shared-ui/reducers/SettingsReducer';

const THEME_OPTIONS = [
    { key: 'default-light', label: 'Light', colors: ['#0052FF', '#FFFFFF'] },
    { key: 'default-dark', label: 'Dark', colors: ['#0052FF', '#000000'] },
    { key: 'luxury', label: 'Luxury', colors: ['#9A3412', '#FFFFFF'] },
    { key: 'retro', label: 'Retro', colors: ['#475569', '#F1F5F9'] },
    { key: 'arctic', label: 'Arctic', colors: ['#0891B2', '#FFFFFF'] },
    { key: 'nature', label: 'Nature', colors: ['#166534', '#FFFFFF'] },
    { key: 'ember', label: 'Ember', colors: ['#FB923C', '#1E1B4B'] },
    { key: 'dracula', label: 'Dracula', colors: ['#A855F7', '#0F172A'] },
    { key: 'midnight', label: 'Midnight', colors: ['#3B82F6', '#0F172A'] },
    { key: 'cityq-light', label: 'CityQ-Light', colors: ['#FB923C', '#FFFFFF'] },
];

const ThemeSwitcher = () => {
    const { setThemePreset, setThemeMode, themePreset, mode } = useThemeMode();
    const { config, configDispatch } = useSettingsContext();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleThemeSelect = (key) => {
        // Force Dark mode for dark presets
        const isDarkPreset = ['ember', 'dracula', 'midnight', 'dark'].includes(key);
        setThemeMode(isDarkPreset ? 'dark' : 'light');
        setThemePreset(key);
    };

    const handleColorSelect = (color) => {
        configDispatch({ type: SET_PRIMARY_COLOR, payload: color });
    };

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 3000 }}>
            <Tooltip title="Theme">
                <Fab color="primary" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ boxShadow: 4 }}>
                    <IconifyIcon icon="material-symbols:palette-outline" width={24} />
                </Fab>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{ paper: { sx: { width: 280, borderRadius: 3, p: 1, maxHeight: 600, overflowY: 'auto' } } }}
            >
                {/* --- THEMES LIST --- */}
                <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700}>Default</Typography>
                    <IconifyIcon icon="material-symbols:keyboard-arrow-up-rounded" />
                </Box>

                {THEME_OPTIONS.map((theme) => (
                    <MenuItem
                        key={theme.key}
                        onClick={() => handleThemeSelect(theme.key)}
                        sx={{ borderRadius: 1.5, py: 0.5 }}
                    >
                        <ListItemIcon>
                            <Radio checked={themePreset === theme.key} size="small" sx={{ p: 0 }} />
                        </ListItemIcon>
                        <ListItemText primary={theme.label} primaryTypographyProps={{ variant: 'body2' }} />

                        {/* Color Previews on the right */}
                        <Stack direction="row" spacing={0.5}>
                            <Box sx={{ width: 14, height: 14, bgcolor: theme.colors[0], borderRadius: 0.5 }} />
                            <Box sx={{ width: 14, height: 14, bgcolor: theme.colors[1], borderRadius: 0.5, border: '1px solid #ddd' }} />
                        </Stack>
                    </MenuItem>
                ))}

                <Divider sx={{ my: 1.5 }} />

                {/* --- PRIMARY COLOR GRID --- */}
                <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Primary Color</Typography>
                    <Grid container spacing={1}>
                        {COLOR_GROUPS.map((group) => (
                            <Grid item xs={2.4} key={group.key} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Box
                                    onClick={() => handleColorSelect(group.main)}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: group.main,
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: config.primaryColor === group.main ? '2px solid' : 'none',
                                        borderColor: 'primary.main',
                                        '&:hover': { transform: 'scale(1.1)' },
                                        transition: '0.2s'
                                    }}
                                >
                                    {config.primaryColor === group.main && (
                                        <IconifyIcon icon="material-symbols:check-small-rounded" style={{ color: 'white' }} />
                                    )}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Menu>
        </Box>
    );
};

export default ThemeSwitcher;