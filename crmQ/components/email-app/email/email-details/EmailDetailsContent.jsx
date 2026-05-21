import { Avatar, Box, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useEmailContext } from 'providers/EmailProvider';
import Image from 'components/base/Image';

const EmailDetailsContent = ({ email: propEmail }) => {
  const { emailState } = useEmailContext();

  // 🚀 Prefer the Prop over Context to prevent blank screens
  const email = propEmail || emailState?.email;

  if (!email) return null;

  return (
    <>
      <Typography variant="h4" sx={{ fontWeight: 400, my: 3 }}>
        {email?.subject}
      </Typography>
      <Stack spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Avatar alt={email?.user?.name} src={email?.user?.avatar} sx={{ width: 32, height: 32 }} />
        <div>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {email?.user?.name || 'Unknown User'}
          </Typography>
          <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            {email?.user?.email || 'No Email'}
          </Typography>
          <Typography variant="caption" sx={{ mr: 0.5, color: 'text.disabled' }}>
            To:{' '}
          </Typography>
          <Typography variant="caption">{email?.to || 'Unknown'}</Typography>
        </div>
        <Typography variant="body2" sx={{ ml: 'auto' }}>
          {email?.time ? dayjs(email.time).fromNow() : ''}
        </Typography>
      </Stack>

      <Box
        sx={{
          typography: 'body2',
          '& p': { mt: 0, mb: 1.5 },
          '& a': { color: 'primary.main', textDecoration: 'none' },
          '& strong': { fontWeight: 600 }
        }}
        dangerouslySetInnerHTML={{
          __html: typeof email?.details === 'string' ? email.details : ''
        }}
      />

      {email?.attachments && Array.isArray(email.attachments) && (
        <Stack direction="column" spacing={2} sx={{ alignItems: 'start', mt: 3 }}>
          {email.attachments.map(
            (attachment) =>
              attachment?.fileType === 'image' && (
                <Image
                  key={attachment.id || attachment.name}
                  src={attachment.file}
                  alt=""
                  width={320}
                  height={320}
                  sx={{ height: 'auto', maxWidth: 320, width: 1 }}
                />
              ),
          )}
        </Stack>
      )}
    </>
  );
};

export default EmailDetailsContent;