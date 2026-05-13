'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Stack, Typography, Dialog, DialogContent, IconButton, Box, Divider } from '@mui/material';
import dayjs from 'dayjs';

import { useEmailContext } from 'providers/EmailProvider';
import { GET_EMAILS } from 'reducers/EmailReducer';
import Image from 'components/base/Image';
import SimpleBar from 'components/base/SimpleBar';
import EmailHeader from './EmailHeader';
import EmailList from './EmailList';
import EmailListHeader from './email-list-header/EmailListHeader';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailDetailsContainer from '../email-details/EmailDetailsContainer';

const EmailListContainer = ({ toggleDrawer, explicitEmailList = [] }) => {
  const [selectedEmailPopup, setSelectedEmailPopup] = useState(null);
  const { emailState, emailDispatch } = useEmailContext();
  const { emails = [], initialEmails = [] } = emailState || {};
  const displayList = explicitEmailList.length > 0 ? explicitEmailList : (emailState?.emails || []);

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  const isDetailsView = pathname.includes('/details/');
  const label = isDetailsView
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  if (!label || label === 'undefined' || label === 'email') {
    label = 'inbox';
  }

  useEffect(() => {
    if (emailDispatch && label && isNaN(label) && emailState?.initialEmails?.length > 0) {
      emailDispatch({ type: 'GET_EMAILS', payload: label });
    }
  }, [label, emailDispatch, emailState?.initialEmails]);

  const emailData = useMemo(() => {
    return displayList.reduce(
      (acc, val) => {
        const diffInDays = dayjs().diff(dayjs(val.time), 'days');
        if (diffInDays === 0) acc.today.push(val);
        else if (diffInDays === 1) acc.yesterday.push(val);
        else acc.older.push(val);
        return acc;
      },
      { today: [], yesterday: [], older: [] },
    );
  }, [emails, explicitEmailList]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SimpleBar sx={{ flex: 1, py: 2 }}>
        <Stack direction="column">
          <EmailHeader toggleDrawer={toggleDrawer} />
          <EmailListHeader />
          <Stack direction="column" gap={1} sx={{ flex: 1, mt: 2 }}>
            {Object.keys(emailData).map((key) =>
              emailData[key].length > 0 && (
                <EmailList
                  key={key}
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                  emails={emailData[key]}
                  onEmailClick={(mail) => setSelectedEmailPopup(mail)}
                />
              )
            )}
            {(explicitEmailList || emails).length === 0 && (
              <Stack direction="column" sx={{ alignItems: 'center', py: 10 }}>
                <Image src={{ light: '/assets/images/illustrations/7.webp', dark: '/assets/images/illustrations/7-dark.webp' }} width={100} />
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 2 }}>
                  No conversations in {label}.
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </SimpleBar>

      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          Showing {(explicitEmailList || emails).length} conversations
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" disabled><IconifyIcon icon="material-symbols:chevron-left" /></IconButton>
          <Typography variant="caption">1 of 1</Typography>
          <IconButton size="small" disabled><IconifyIcon icon="material-symbols:chevron-right" /></IconButton>
        </Stack>
      </Box>

      {/* 🚀 FIXED: selectedEmailPopup is now defined */}
      <Dialog open={Boolean(selectedEmailPopup)} onClose={() => setSelectedEmailPopup(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {selectedEmailPopup && <EmailDetailsContainer />}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EmailListContainer;