// File: pages/crm/email/list/[label].jsx

import { useRouter } from 'next/router';

// 1. Point these imports to your local copied folders
// (Adjust the ../../../../ paths depending on where your src and components folders are)
import Email from '../../../../components/email/Email';
import EmailLayout from '../../../../src/layouts/email-layout/index';

import BreakpointsProvider from '@/shared-ui/providers/BreakpointsProvider';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import NavProvider from '@/shared-ui/layouts/main-layout/NavProvider';

export default function EmailStandalonePage() {
    const router = useRouter();

    // Failsafe: Prevent rendering until Next.js reads the "[label]" from the URL
    if (!router.isReady) {
        return null; // Or a loading spinner
    }

    return (
        <SettingsProvider>
            <ThemeProvider>
                <BreakpointsProvider>
                    <NavProvider>
                        <EmailLayout>
                            <Email />
                        </EmailLayout>
                    </NavProvider>
                </BreakpointsProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}