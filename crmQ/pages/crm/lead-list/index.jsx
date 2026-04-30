'use client';
import { CssBaseline, Box } from '@mui/material';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import BreakpointsProvider from '@/shared-ui/providers/BreakpointsProvider'; // 👈 1. NEW IMPORT
import LeadsTable from '../../../data/crm/LeadList';
import LeadSideAndHeaderLayout from '../../../components/side-and-header/LeadSideAndHeaderLayout';

export default function LeadListPage() {
    // const openLeadInErpNext = (id) => {
    //     if (typeof window === 'undefined') return;
    //     window.location.assign(`/m/crmq/iframe/app/lead/${encodeURIComponent(id)}`);
    // };

    return (
        <SettingsProvider>
            <ThemeProvider>
                <CssBaseline />
                <BreakpointsProvider>
                    <LeadSideAndHeaderLayout>
                        <Box sx={{ p: 0 }}>
                            <LeadsTable />
                        </Box>
                    </LeadSideAndHeaderLayout>
                </BreakpointsProvider>

            </ThemeProvider>
        </SettingsProvider>
    );
}