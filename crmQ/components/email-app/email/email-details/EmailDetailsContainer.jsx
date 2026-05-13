'use client';

import { useEffect } from 'react';
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

  // 🚀 Computed instantly. No Global Context lookup needed.
  const activeEmail = explicitEmails.find((e) => String(e.id) === String(extractedId));

  // 🚀 Fire "Mark as Read" silently in the background AFTER the new email renders
  useEffect(() => {
    if (extractedId && activeEmail && emailDispatch && activeEmail.readAt === null) {
      const timer = setTimeout(() => {
        emailDispatch({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: { ids: [extractedId], actionType: 'mark_as_read' },
        });
      }, 300); // 300ms delay guarantees it won't block the UI transition
      return () => clearTimeout(timer);
    }
  }, [extractedId, activeEmail, emailDispatch]);

  if (explicitEmails.length === 0) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <CircularProgress size={30} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Loading conversation...</Typography>
      </Stack>
    );
  }

  if (!activeEmail) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          No conversations selected
        </Typography>
      </Stack>
    );
  }

  return (
    <SimpleBar sx={{ px: { xs: 3, md: 5 }, py: 5, height: '100%' }}>
      {/* 🚀 Pass the direct object to children so they load instantly */}
      <EmailDetailsHeader email={activeEmail} />
      <EmailDetailsContent email={activeEmail} />
      <EmailReply email={activeEmail} />
    </SimpleBar>
  );
};

export default EmailDetailsContainer;