'use client';

import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import EmailSidebar from 'layouts/email-layout/EmailSidebar';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import { emailSidebarWidth, useEmailContext } from 'providers/EmailProvider';
import Resizable from 'components/base/Resizable';
import EmailDetailsContainer from 'components/sections/email/email-details/EmailDetailsContainer';
import EmailListContainer from 'components/sections/email/email-list/EmailListContainer';

const EmailDetails = () => {
  const context = useEmailContext();
  const initialEmails = context?.emailState?.initialEmails || [];
  const [fallbackData, setFallbackData] = useState([]);
  const handleResize = context?.handleResize || [];

  const { up } = useBreakpoints();
  const upXl = up('xl');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upXl);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  useEffect(() => {
    setIsDrawerOpen(upXl);
  }, [upXl]);

  useEffect(() => {
    // 🚀 THE MAGIC: Grab data from browser memory in 1 millisecond
    const cached = sessionStorage.getItem('erp_emails');
    if (cached) {
      const parsedData = JSON.parse(cached);
      setFallbackData(parsedData);
      if (context?.emailDispatch && initialEmails.length === 0) {
        context.emailDispatch({ type: 'INITIALIZE_EMAILS', payload: parsedData });
      }
      return; // EXIT EARLY! Do not wait for the network!
    }

    // Failsafe: Only hit the API if the user did a hard-refresh and the cache is gone
    if (initialEmails.length === 0) {
      fetch('/api/lead-emails?lead_id=CRM-LEAD-2026-00074')
        .then((res) => res.json())
        .then((data) => {
          sessionStorage.setItem('erp_emails', JSON.stringify(data));
          setFallbackData(data);
          if (context?.emailDispatch) {
            context.emailDispatch({ type: 'INITIALIZE_EMAILS', payload: data });
          }
        })
        .catch(err => console.error("🛠️ ERP FETCH ERROR:", err));
    }
  }, [initialEmails.length, context?.emailDispatch]);

  const dataToUse = initialEmails.length > 0 ? initialEmails : fallbackData;

  return (
    <>
      <EmailSidebar isDrawerOpen={isDrawerOpen} toggleDrawer={toggleDrawer} up={upXl} />
      <Box
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          marginLeft: { xl: `-${emailSidebarWidth}px` },
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
        <Resizable
          handleResize={handleResize}
          sx={{
            display: { xs: 'none', lg: 'block' },
            ['.resizable-handler']: {
              width: '8px !important',
              borderLeft: '1px solid',
              borderColor: 'divider',
            },
          }}
          defaultSize={{ width: '43%' }}
          maxWidth="calc(100% - 375px)"
        >
          <Paper sx={{ height: 1 }}>
            <BulkSelectProvider data={dataToUse}>
              <EmailListContainer toggleDrawer={toggleDrawer} explicitEmailList={dataToUse} />
            </BulkSelectProvider>
          </Paper>
        </Resizable>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <EmailDetailsContainer explicitEmails={dataToUse} />
        </Box>
      </Box>
    </>
  );
};

export default EmailDetails;