'use client';

import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import EmailSidebar from 'layouts/email-layout/EmailSidebar';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import { emailSidebarWidth, useEmailContext } from 'providers/EmailProvider';
import Resizable from 'components/base/Resizable';
import EmailDetailsContainer from 'components/email-app/email/email-details/EmailDetailsContainer';
import EmailListContainer from 'components/email-app/email/email-list/EmailListContainer';
import { INITIALIZE_EMAILS } from 'reducers/EmailReducer';

const EmailDetails = () => {
  const context = useEmailContext();
  const emailState = context?.emailState;
  
  // 🚀 THE FIX: Grab the Master Global List
  const masterList = emailState?.initialEmails || [];
  
  const [fallbackData, setFallbackData] = useState([]);
  const handleResize = context?.handleResize || [];

  const { up } = useBreakpoints();
  const upXl = up('xl');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upXl);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  // 🚀 THE FIX: Use the Master List for all children so it can ALWAYS find the searched email
  const displayData = masterList.length > 0 ? masterList : fallbackData;

  useEffect(() => {
    setIsDrawerOpen(upXl);
  }, [upXl]);

  useEffect(() => {
    // Safe Cache Load
    try {
      const cached = sessionStorage.getItem('erp_global_emails');
      if (cached) {
        const parsedData = JSON.parse(cached);
        setFallbackData(parsedData);
        if (context?.emailDispatch && masterList.length === 0) {
          context.emailDispatch({ type: INITIALIZE_EMAILS, payload: parsedData });
        }
      }
    } catch (e) {
      sessionStorage.removeItem('erp_global_emails');
    }

    // Fetch if missing
    if (masterList.length === 0) {
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
  }, [masterList.length, context?.emailDispatch]);

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
              {/* Left pane list receives master data */}
              <EmailListContainer toggleDrawer={toggleDrawer} explicitEmailList={displayData} />
            </BulkSelectProvider>
          </Paper>
        </Resizable>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Right pane details receives master data */}
          <EmailDetailsContainer explicitEmails={displayData} />
        </Box>
      </Box>
    </>
  );
};

export default EmailDetails;