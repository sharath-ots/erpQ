import { Avatar, Stack, Typography, Box } from '@mui/material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'components/base/Image';

dayjs.extend(relativeTime);

const EmailDetailsContent = ({ emailData }) => {
  const email = emailData;

  // 🚀 EXPERT FIX: Pointed these to `email.user.name` and `email.user.email`
  const time = email?.creation || email?.time || new Date();
  const senderName = email?.user?.name || email?.sender || 'Unknown';
  const senderEmail = email?.user?.email || email?.sender_email || '';
  const subject = email?.subject || 'No Subject';
  const content = email?.content || email?.message || email?.details || '';

  return (
    <>
      <Typography variant="h4" sx={{ fontWeight: 400, my: 3 }}>
        {subject}
      </Typography>
      <Stack spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Avatar alt={senderName} src={email?.user?.avatar} sx={{ width: 32, height: 32 }} />
        <div>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {senderName}
          </Typography>
          <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            {senderEmail}
          </Typography>
          <Typography variant="caption" sx={{ mr: 0.5, color: 'text.disabled' }}>
            To:{' '}
          </Typography>
          <Typography variant="caption">Me</Typography>
        </div>
        <Typography variant="body2" sx={{ ml: 'auto' }}>
          {dayjs(time).fromNow()}
        </Typography>
      </Stack>

      {/* Render ERPNext's raw HTML email body securely */}
      <Box
        sx={{
          fontSize: '0.875rem',
          color: 'text.primary',
          '& img': { maxWidth: '100%' },
          mb: 4
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {email?.attachments && (
        <Stack direction="column" spacing={2} sx={{ alignItems: 'start', mt: 3 }}>
          {email.attachments.map(
            (attachment) =>
              attachment.fileType === 'image' && (
                <Image
                  key={attachment.id}
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