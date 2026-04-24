import React from 'react';
import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import KanbanProvider from '../../../providers/KanbanProvider';
import BreakpointsProvider from 'providers/BreakpointsProvider';
import NavProvider from 'layouts/main-layout/NavProvider';

import Kanban from '../../../components/crm-board/kanban/kanban/index';

export default function KanbanRoute() {
    return (
        <SettingsProvider>
            <ThemeProvider>
                <CssBaseline />
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <BreakpointsProvider>
                        <NavProvider>
                            <KanbanProvider>
                                <Kanban />
                            </KanbanProvider>
                        </NavProvider>
                    </BreakpointsProvider>
                </LocalizationProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}