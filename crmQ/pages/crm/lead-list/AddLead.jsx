import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import MainLayout from '../../../src/layouts/main-layout';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import BreakpointsProvider from '@/shared-ui/providers/BreakpointsProvider';
import AddLead from '../../../data/crm/AddLead/index';

export default function AddLeadPage() {

    return (
        <SettingsProvider>
            <ThemeProvider>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <CssBaseline />
                    <BreakpointsProvider>
                        <MainLayout>
                            <AddLead />
                        </MainLayout>
                    </BreakpointsProvider>
                </LocalizationProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}