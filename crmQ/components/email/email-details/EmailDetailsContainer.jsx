'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
// 🚀 EXPERT FIX 1: We completely removed the `useEmailContext` dependency!
// This component now relies purely on the props passed to it from the pop-up.
import SimpleBar from 'components/base/SimpleBar';
import PageLoader from 'components/loading/PageLoader';

// Assuming these children components also need the email data.
// Make sure to update them to accept `emailData` as a prop if they don't already!
import EmailDetailsContent from './EmailDetailsContent';
import EmailDetailsHeader from './EmailDetailsHeader';
import EmailReply from './EmailReply';

// 🚀 EXPERT FIX 2: Accept the FULL email object from the Pop-up, not just the ID.
const EmailDetailsContainer = ({ explicitEmailData }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Because we passed the whole object, there is no need to wait for a fetch!
    if (explicitEmailData) {
      setIsLoading(false);
    } else {
      // Failsafe: stop loading after 500ms even if no data is found
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [explicitEmailData]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <SimpleBar
      sx={{ px: { xs: 3, md: 5 }, py: 5, '.simplebar-content': { height: explicitEmailData ? 'auto' : 1 } }}
    >
      {/* 🚀 EXPERT FIX 3: Render if explicitEmailData exists */}
      {explicitEmailData ? (
        <>
          {/* Note: You must update these three components to accept `emailData={explicitEmailData}` 
              so they don't try to pull from the empty context either! */}
          {/* <EmailDetailsHeader emailData={explicitEmailData} /> */}
          <EmailDetailsContent emailData={explicitEmailData} />
          <EmailReply emailData={explicitEmailData} />
        </>
      ) : (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 5 }}>
            Could not load email details. Data is missing.
          </Typography>
        </Stack>
      )}
    </SimpleBar>
  );
};

export default EmailDetailsContainer;