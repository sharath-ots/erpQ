import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
// 1. Swap the custom hook for standard MUI hooks
import { useTheme, useMediaQuery } from '@mui/material';

import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import SimpleBar from '@/shared-ui/components/base/SimpleBar';
import EmailAccordion from './EmailAccordion';

const EmailTabPanel = ({ emailData }) => {
  // 2. Use the standard MUI breakpoint logic
  const theme = useTheme();
  //const upSm = useMediaQuery(theme.breakpoints.up('sm'));

  return (
    <Container maxWidth={false} sx={{ maxWidth: 800, py: 2, bgcolor: 'background.default' }}>
      <SimpleBar sx={{ maxHeight: 504 }}>
        <Stack direction="column" gap={2}>
          {emailData.map((email) => (
            <EmailAccordion key={email.id} email={email} />
          ))}
        </Stack>
      </SimpleBar>

      {/* <Stack gap={0.5} mt={3}>
        <Button
          size="small"
          shape={!upSm ? 'square' : undefined}
          variant="soft"
          color="neutral"
          sx={{ gap: 0.5 }}
        >
          <IconifyIcon icon="material-symbols:reply-rounded" sx={{ fontSize: 16 }} />
          {upSm && <Box component="span">Reply</Box>}
        </Button>
        <Button
          size="small"
          shape={!upSm ? 'square' : undefined}
          variant="soft"
          color="neutral"
          sx={{ gap: 0.5 }}
        >
          <IconifyIcon icon="material-symbols:forward-rounded" sx={{ fontSize: 16 }} />
          {upSm && <Box component="span">Forward</Box>}
        </Button>
        <Button
          size="small"
          shape={!upSm ? 'square' : undefined}
          variant="soft"
          color="neutral"
          sx={{ gap: 0.5 }}
        >
          <IconifyIcon icon="material-symbols:archive-outline-rounded" sx={{ fontSize: 16 }} />
          {upSm && <Box component="span">Archive</Box>}
        </Button>
        <Button
          size="small"
          shape={!upSm ? 'square' : undefined}
          variant="soft"
          color="neutral"
          sx={{ gap: 0.5 }}
        >
          <IconifyIcon icon="material-symbols:all-inbox-outline-rounded" sx={{ fontSize: 16 }} />
          {upSm && <Box component="span">Open Inbox</Box>}
        </Button>
      </Stack> */}
    </Container>
  );
};

export default EmailTabPanel;