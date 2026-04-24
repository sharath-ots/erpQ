'use client';

import { Box, Paper } from '@mui/material';
import BulkSelectProvider from 'providers/BulkSelectProvider';
import EmailListContainer from 'components/email/email-list/EmailListContainer';

const EmailDetails = ({ emailData }) => {
  // Use the passed API data, or default to an empty array
  const liveEmails = emailData || [];

  return (
    <Box sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex' }}>
      {/* We removed the <Resizable> split-screen wrapper and the right-side reading pane! */}
      {/* Now the Paper takes up the full 100% width of the tab. */}
      <Paper sx={{ height: 1, flex: 1, borderRadius: 0, boxShadow: 'none', overflow: 'hidden' }}>
        <BulkSelectProvider data={liveEmails}>
          {/* This container renders the list, and handles the Pop-up when clicked */}
          <EmailListContainer explicitEmailList={liveEmails} />
        </BulkSelectProvider>
      </Paper>
    </Box>
  );
};

export default EmailDetails;