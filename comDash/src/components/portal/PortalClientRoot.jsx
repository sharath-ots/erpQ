"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SharedUiTokensProvider } from "@/components/providers/SharedUiTokensProvider";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { SessionProvider } from 'next-auth/react';

// 👇 Adjust these import paths to match where you copied the college 'providers' folder!
import BreakpointsProvider from '../../ui/providers/BreakpointsProvider';
import LocalizationProvider from '../../ui/providers/LocalizationProvider';
import NotistackProvider from '../../ui/providers/NotistackProvider';
import SettingsProvider from '../../ui/providers/SettingsProvider';
import ThemeProvider from '../../ui/providers/ThemeProvider';
import VisionModeProvider from '../../ui/providers/VisionModeProvider';
import { ERPUserProvider } from "../../ui/providers/ERPUserProvider";

import 'locales/i18n';

/** Single client boundary for Ant Design + MUI theme shell */
export function PortalClientRoot({ children, session }) {
  return (
    <AntdRegistry>
      <SharedUiTokensProvider>
        <AppRouterCacheProvider>
          <SessionProvider session={session}>
            <ERPUserProvider>
              <SettingsProvider>
                <LocalizationProvider>
                  <ThemeProvider>
                    <VisionModeProvider>
                      <NotistackProvider>
                        <BreakpointsProvider>

                          {/* EVERYTHING renders inside this secure, globally provided context! */}
                          {children}

                        </BreakpointsProvider>
                      </NotistackProvider>
                    </VisionModeProvider>
                  </ThemeProvider>
                </LocalizationProvider>
              </SettingsProvider>
            </ERPUserProvider>
          </SessionProvider>
        </AppRouterCacheProvider>
      </SharedUiTokensProvider>
    </AntdRegistry>
  );
}