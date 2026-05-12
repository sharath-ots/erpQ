import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Stack, Typography, Dialog, DialogContent, IconButton } from '@mui/material';
import illustrationDark from '../../../public/assets/images/illustrations/7-dark.webp';
import illustration from '../../../public/assets/images/illustrations/7.webp';
import dayjs from 'dayjs';

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

  const activeEmails = explicitEmailList || [];

  const onEmailClick = async (mail) => {
    setSelectedEmailPopup(mail);

    if (mail.seen === 0) {
      try {
        const response = await fetch('/api/lead/mark-email-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_id: mail.name })
        });

        if (response.ok) {
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


  useEffect(function () {
    let isMounted = true;

    if (activeEmails && activeEmails.length > 0) {
      setIsLoading(false);
    }

    const timer = setTimeout(function () {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 1500);

    // Explicit return block
    return function cleanup() {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeEmails]);

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
            <EmailDetailsContainer explicitEmailData={selectedEmailPopup} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailListContainer;