'use client';

import { useEffect, useState } from 'react';
import { Paper, Stack, CircularProgress, Typography } from '@mui/material';
import EmailSidebar from 'layouts/email-layout/EmailSidebar';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import EmailListContainer from 'components/sections/email/email-list/EmailListContainer';

// 🚀 1. Import BOTH the Provider and the Hook from your file
import EmailProvider, { useEmailContext, emailSidebarWidth } from 'providers/EmailProvider';

const EmailContent = () => {
  // This will NO LONGER be undefined because it is wrapped by the component below
  const { emailState, emailDispatch } = useEmailContext();

  const { up } = useBreakpoints();
  const upMd = up('md');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upMd);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/email-app?bypass=${timestamp}`, { cache: 'no-store' });
        const data = await res.json();

        // If the API returns the array of 500 items, save them!
        if (Array.isArray(data) && emailDispatch) {
          emailDispatch({ type: 'INITIALIZE_EMAILS', payload: data });
          emailDispatch({ type: 'GET_EMAILS', payload: 'inbox' });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!emailState?.initialEmails || emailState.initialEmails.length === 0) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [emailDispatch, emailState?.initialEmails?.length]);

  return (
    <>
      <EmailSidebar isDrawerOpen={isDrawerOpen} toggleDrawer={toggleDrawer} up={upMd} />
      <Paper
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          marginLeft: { md: `-${emailSidebarWidth || 270}px` },
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
        {isLoading ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <CircularProgress size={30} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">Loading your emails...</Typography>
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

export default function Email() {
  return (
    <EmailProvider>
      <EmailContent />
    </EmailProvider>
  );
}