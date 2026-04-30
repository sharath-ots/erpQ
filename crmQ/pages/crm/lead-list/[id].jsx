import { useRouter } from 'next/router';
import { CssBaseline, Box, Button } from '@mui/material';
import { createTheme } from '@/shared-ui/theme/theme';
import MainLayout from '../../../src/layouts/main-layout';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import LeadDetails from '../../../data/crm/LeadDeatils';

export default function LeadDetailsPage() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <SettingsProvider>
            <ThemeProvider>
                <CssBaseline />
                <MainLayout>
                    <Box sx={{ p: 4 }}>
                        <Button
                            variant="outlined"
                            onClick={() => router.push('/m/crmq/lead-list')}
                            sx={{ mb: 3 }}
                        >
                            ← Back to Leads
                        </Button>
                        {id && <LeadDetails leadId={id} />}
                    </Box>
                </MainLayout>
            </ThemeProvider>
        </SettingsProvider>
    );
}