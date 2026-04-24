import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Stack, Typography, Dialog, DialogContent, IconButton } from '@mui/material';
import illustrationDark from '../../../public/assets/images/illustrations/7-dark.webp';
import illustration from '../../../public/assets/images/illustrations/7.webp';
import dayjs from 'dayjs';
import { useEmailContext } from 'providers/EmailProvider';
import { GET_EMAILS } from 'reducers/EmailReducer';
import Image from 'components/base/Image';
import SimpleBar from 'components/base/SimpleBar';
import PageLoader from 'components/loading/PageLoader';
import EmailHeader from './EmailHeader';
import EmailList from './EmailList';
import EmailListHeader from './email-list-header/EmailListHeader';
import IconifyIcon from 'components/base/IconifyIcon';

import EmailDetailsContainer from '../email-details/EmailDetailsContainer';

const EmailListContainer = ({ toggleDrawer, explicitEmailList }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmailPopup, setSelectedEmailPopup] = useState(null);

  const params = useParams();
  const label = params?.label || 'inbox';

  // 🚀 EXPERT FIX: Completely bypass the Context! 
  // Force the UI to use your live ERPNext API data array.
  const activeEmails = explicitEmailList || [];

  const onEmailClick = async (mail) => {
    // 1. Open the popup immediately for a fast UI feel
    setSelectedEmailPopup(mail);

    // 2. If the email is unread (seen is 0), update ERPNext
    if (mail.seen === 0) {
      try {
        const response = await fetch('/api/lead/mark-email-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_id: mail.name }) // Frappe uses 'name' as the ID
        });

        if (response.ok) {
          // 3. Update your local list so the bold styling disappears immediately
          // We look through 'activeEmails' and change the seen status of this specific mail
          mail.seen = 1;
        }
      } catch (error) {
        console.error("Failed to mark email as read:", error);
      }
    }
  };

  const emailData = useMemo(() => {
    return activeEmails.reduce(
      (acc, val) => {
        const diffInDays = dayjs().diff(dayjs(val.time), 'days');
        if (diffInDays === 0) {
          acc.today.push(val);
        } else if (diffInDays === 1) {
          acc.yesterday.push(val);
        } else {
          acc.older.push(val);
        }
        return acc;
      },
      { today: [], yesterday: [], older: [] },
    );
  }, [activeEmails]);

  useEffect(() => {
    if (activeEmails.length > 0) {
      setIsLoading(false);
    }
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [activeEmails]);

  // (You can delete the old useEffect that calls `emailDispatch({ type: GET_EMAILS... })` 
  // because we no longer rely on the reducer to get our list data!)

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <SimpleBar
        sx={{
          py: 5,
          '& .simplebar-content': {
            height: activeEmails.length ? 'auto' : 1,
          },
        }}
      >
        <Stack direction="column" sx={{ height: 1 }}>
          <EmailHeader toggleDrawer={toggleDrawer} />
          <EmailListHeader />
          <Stack direction="column" gap={3} sx={{ flex: 1 }}>

            {Object.keys(emailData).map(
              (key) =>
                emailData[key].length > 0 && (
                  <EmailList
                    key={key}
                    title={key.charAt(0).toUpperCase() + key.slice(1)}
                    emails={emailData[key]}
                    // 🚀 EXPERT FIX: Pass the state setter down to the list
                    onEmailClick={onEmailClick}
                  />
                ),
            )}

            {!activeEmails.length && (
              <Stack
                direction="column"
                sx={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}
              >
                <Image src={{ light: illustration, dark: illustrationDark }} width={100} />
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 2 }}>
                  No conversations in {label}.
                </Typography>
              </Stack>
            )}

          </Stack>
        </Stack>
      </SimpleBar>

      {/* 🚀 EXPERT FIX: The Pop-up Dialog! */}
      <Dialog
        open={Boolean(selectedEmailPopup)}
        onClose={() => setSelectedEmailPopup(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', height: '80vh' } }}
      >
        <IconButton
          onClick={() => setSelectedEmailPopup(null)}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: '#f1f5f9' } }}
        >
          <IconifyIcon icon="material-symbols:close" />
        </IconButton>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {selectedEmailPopup && (
            // 🚀 FIXED: We now pass the entire `selectedEmailPopup` object!
            <EmailDetailsContainer explicitEmailData={selectedEmailPopup} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailListContainer;