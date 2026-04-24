import { useRouter } from 'next/router';

// 1. Your EmailDetails component
import EmailDetails from '../../../../../components/email/EmailDetails';
// 2. Add the extra '../' since this file is one folder deeper than [label].jsx
import EmailLayout from '../../../../../src/layouts/email-layout/index';

import BreakpointsProvider from '@/shared-ui/providers/BreakpointsProvider';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import NavProvider from '@/shared-ui/layouts/main-layout/NavProvider';

export default function EmailDetailsStandalonePage() {
    const router = useRouter();

    // Prevent rendering until Next.js reads both [label] and [id] from the URL
    if (!router.isReady) {
        return null;
    }

    return (
        <SettingsProvider>
            <ThemeProvider>
                <BreakpointsProvider>
                    <NavProvider>
                        <EmailLayout>
                            {/* Render the details view safely wrapped in context! */}
                            <EmailDetails />
                        </EmailLayout>
                    </NavProvider>
                </BreakpointsProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}