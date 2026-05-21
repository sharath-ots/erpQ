'use client';

import { useRouter, useParams } from 'next/navigation';

import Email from '../../components/email-app/email/Email';
import EmailLayout from '../../src/layouts/email-layout/index';

import BreakpointsProvider from '../providers/BreakpointsProvider';
import ThemeProvider from '../providers/ThemeProvider';
import SettingsProvider from '../providers/SettingsProvider';
import NavProvider from '../layouts/main-layout/NavProvider';

export default function EmailStandalonePage() {

    return (
        <EmailLayout>
            <Email />
        </EmailLayout>

    );
}