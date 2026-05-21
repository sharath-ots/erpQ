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
import { INITIALIZE_EMAILS } from 'reducers/EmailReducer';

const EmailDetails = () => {
  const context = useEmailContext();
  const emailState = context?.emailState;
  const initialEmails = emailState?.initialEmails || [];
  const [fallbackData, setFallbackData] = useState([]);
  const handleResize = context?.handleResize || [];

  const { up } = useBreakpoints();
  const upXl = up('xl');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upXl);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const displayData = initialEmails.length > 0 ? emailState.emails : fallbackData;

  useEffect(() => {
    setIsDrawerOpen(upXl);
  }, [upXl]);

  useEffect(() => {
    // 🚀 SAFE CACHE LOAD
    try {
      const cached = sessionStorage.getItem('erp_global_emails');
      if (cached) {
        const parsedData = JSON.parse(cached);
        setFallbackData(parsedData);
        if (context?.emailDispatch && initialEmails.length === 0) {
          context.emailDispatch({ type: INITIALIZE_EMAILS, payload: parsedData });
        }
      }
    } catch (e) {
      sessionStorage.removeItem('erp_global_emails');
    }

    if (initialEmails.length === 0) {
      const timestamp = new Date().getTime();
      fetch(`/api/email-app?bypass=${timestamp}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!data.error && Array.isArray(data)) {
            setFallbackData(data);
            if (context?.emailDispatch) {
              context.emailDispatch({ type: INITIALIZE_EMAILS, payload: data });
            }
            try {
              sessionStorage.setItem('erp_global_emails', JSON.stringify(data));
            } catch (e) {
              sessionStorage.setItem('erp_global_emails', JSON.stringify(data.slice(0, 40)));
            }
          }
        }).catch(err => console.error("Background sync error:", err));
    }
  }, [initialEmails.length, context?.emailDispatch]);

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
            <BulkSelectProvider data={displayData}>
              <EmailListContainer toggleDrawer={toggleDrawer} explicitEmailList={displayData} />
            </BulkSelectProvider>
          </Paper>
        </Resizable>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <EmailDetailsContainer explicitEmails={displayData} />
        </Box>
      </Box>
    </>
  );
};

export default EmailDetails;