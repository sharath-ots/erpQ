'use client';

import { useEffect, useState } from 'react';
import { Paper } from '@mui/material';
import EmailSidebar from 'layouts/email-layout/EmailSidebar';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import { emailSidebarWidth, useEmailContext } from 'providers/EmailProvider';
import EmailListContainer from './email-list/EmailListContainer';

const Email = () => {
  const [realEmails, setRealEmails] = useState([]);
  const { emailDispatch } = useEmailContext();

  const { up } = useBreakpoints();
  const upMd = up('md');
  const [isDrawerOpen, setIsDrawerOpen] = useState(upMd);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  useEffect(() => {
    const getData = async () => {
      try {
        // 🚀 1. INSTANT LOAD: Check browser cache first so the UI doesn't wait
        const cached = sessionStorage.getItem('erp_emails');
        if (cached) {
          const parsed = JSON.parse(cached);
          setRealEmails(parsed);
          if (emailDispatch) emailDispatch({ type: 'INITIALIZE_EMAILS', payload: parsed });
        }

        // 🚀 2. BACKGROUND SYNC: Fetch fresh data from ERPNext
        const res = await fetch('/api/lead-emails?lead_id=CRM-LEAD-2026-00074');
        const data = await res.json();

        // Save to browser memory for the Details page
        sessionStorage.setItem('erp_emails', JSON.stringify(data));
        setRealEmails(data);

        if (emailDispatch) {
          emailDispatch({ type: 'INITIALIZE_EMAILS', payload: data });
        }
      } catch (err) {
        console.error("🛠️ ERP FETCH ERROR:", err);
      }
    };
    getData();
  }, [emailDispatch]);

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
        <BulkSelectProvider data={realEmails}>
          <EmailListContainer toggleDrawer={toggleDrawer} explicitEmailList={realEmails} />
        </BulkSelectProvider>
      </Paper>
    </>
  );
};

export default Email;