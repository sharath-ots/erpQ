'use client';

import { Stack } from '@mui/material';
import EmailProvider from '../../providers/EmailProvider';

const EmailLayout = ({ children }) => {
  return (
    <EmailProvider>
      <Stack
        sx={{
          height: { xs: 'calc(100vh - 32px)', md: 'calc(100vh - 16px)' },
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </Stack>
    </EmailProvider>
  );
};

export default EmailLayout;