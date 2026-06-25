'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Stack, Typography, CircularProgress } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import SimpleBar from 'components/base/SimpleBar';
import EmailDetailsContent from './EmailDetailsContent';
import EmailDetailsHeader from './EmailDetailsHeader';
import EmailReply from './EmailReply';

const EmailDetailsContainer = ({ explicitEmails = [] }) => {
  const { emailDispatch } = useEmailContext();

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const extractedId = pathParts.pop();

  const activeEmail = useMemo(() => {
    return explicitEmails.find((e) => String(e.id) === String(extractedId));
  }, [explicitEmails, extractedId]);

  useEffect(() => {
    if (extractedId && activeEmail && emailDispatch) {
      emailDispatch({ type: 'GET_EMAIL', payload: extractedId });

      const timer = setTimeout(() => {
        emailDispatch({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: { ids: [extractedId], actionType: 'mark_as_read' },
        });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [extractedId, activeEmail, emailDispatch]);

  // If the ENTIRE system is still fetching emails from the database, show standard buffering
  if (explicitEmails.length === 0) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <CircularProgress size={30} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Loading conversation...</Typography>
      </Stack>
    );
  }

  // If database is ready but URL has a bad ID
  if (!activeEmail) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          No conversations selected
        </Typography>
      </Stack>
    );
  }

  // 🚀 INSTANT RENDER
  return (
    <SimpleBar sx={{ px: { xs: 3, md: 5 }, py: 5, height: '100%' }}>
      <EmailDetailsHeader email={activeEmail} />
      <EmailDetailsContent email={activeEmail} />
      <EmailReply email={activeEmail} />
    </SimpleBar>
  );
};

export default EmailDetailsContainer;