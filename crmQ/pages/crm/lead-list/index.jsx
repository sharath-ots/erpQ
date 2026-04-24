import { useRouter } from 'next/router';
import { Button, CssBaseline, Box } from '@mui/material';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import MainLayout from '../../../src/layouts/main-layout';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import BreakpointsProvider from '@/shared-ui/providers/BreakpointsProvider'; // 👈 1. NEW IMPORT
import LeadsTable from '../../../data/crm/LeadList';
import LeadSideAndHeaderLayout from '../../../components/side-and-header/LeadSideAndHeaderLayout';

export default function LeadListPage() {
    const router = useRouter();

    return (
        <SettingsProvider>
            <ThemeProvider>
                <CssBaseline />
                <BreakpointsProvider>
                    <LeadSideAndHeaderLayout>
                        <Box sx={{ p: 0 }}>
                            <LeadsTable
                                onLeadClick={(id) => router.push(`/crm/lead-list/${id}`)}
                            />
                        </Box>
                    </LeadSideAndHeaderLayout>
                </BreakpointsProvider>

            </ThemeProvider>
        </SettingsProvider>
    );
}