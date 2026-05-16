'use client';

import { useEffect, useState } from 'react';
import { Paper, Stack, CircularProgress, Typography } from '@mui/material';
import EmailSidebar from 'layouts/email-layout/EmailSidebar';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import { emailSidebarWidth, useEmailContext } from 'providers/EmailProvider';
import EmailListContainer from 'components/sections/email/email-list/EmailListContainer';
import { INITIALIZE_EMAILS, SEARCH_EMAIL } from 'reducers/EmailReducer';

const Email = () => {
  const { emailState, emailDispatch } = useEmailContext();
  console.log("📧 Email State:", emailState); // Debug log to inspect email state changes
  const { up } = useBreakpoints();
  const upMd = up('md');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upMd);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);

      // 🚀 1. SAFE CACHE LOAD: Catches the SyntaxError and deletes corrupted data!
      try {
        const cached = sessionStorage.getItem('erp_global_emails');
        if (cached) {
          const parsedData = JSON.parse(cached);
          // 🚀 Only dispatch if it's an actual array!
          if (Array.isArray(parsedData)) {
            if (emailDispatch) emailDispatch({ type: INITIALIZE_EMAILS, payload: parsedData });
          } else {
            sessionStorage.removeItem('erp_global_emails'); // Nuke bad cache
          }
        }
      } catch (e) {
        console.warn("Corrupted cache detected. Nuking bad data...");
        sessionStorage.removeItem('erp_global_emails'); // Clear the poison pill
      }

      // 2. Background Sync
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/email-app?bypass=${timestamp}`, { cache: 'no-store' });
        const data = await res.json();
        console.log("📧 Data:", data); // Debug log to inspect email state changes

        // Ensure data is valid before saving
        if (!data.error && Array.isArray(data)) {
          try {
            sessionStorage.setItem('erp_global_emails', JSON.stringify(data));
          } catch (e) {
            sessionStorage.setItem('erp_global_emails', JSON.stringify(data.slice(0, 40)));
          }

          if (emailDispatch) {
            // 🚀 USE HARDCODED STRINGS to guarantee the reducer catches it
            emailDispatch({ type: 'INITIALIZE_EMAILS', payload: data });
            emailDispatch({ type: 'SEARCH_EMAIL', payload: { query: '', folder: 'inbox' } });
          } else {
            // 🚀 If context is still broken, you will see this error
            console.error("🚨 ERROR: emailDispatch is undefined. Check EmailProvider!");
          }
        }
      } catch (err) {
        console.error("🛠️ GLOBAL FETCH ERROR:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!emailState?.initialEmails || emailState.initialEmails.length === 0) {
      getData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailDispatch]);

  console.log("📧 Email State:", emailState); // Debug log to inspect email state changes

  return (
    <>
      <EmailSidebar isDrawerOpen={isDrawerOpen} toggleDrawer={toggleDrawer} up={upMd} />
      <Paper
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          marginLeft: { md: `-${emailSidebarWidth}px` },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(isDrawerOpen && {
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
          }),
        })}
      >
        {isLoading && (!emailState?.emails || emailState.emails.length === 0) ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <CircularProgress size={30} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">Loading Inbox...</Typography>
          </Stack>
        ) : (
          <BulkSelectProvider data={emailState?.emails || []}>
            <EmailListContainer toggleDrawer={toggleDrawer} explicitEmailList={emailState?.emails || []} />
          </BulkSelectProvider>
        )}
      </Paper>
    </>
  );
};

export default Email;