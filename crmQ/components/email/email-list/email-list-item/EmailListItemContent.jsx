import { Avatar, Box, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import ModernAvatar from './ModernAvatar';

const EmailListItemContent = ({ email }) => {
  const time = email.creation || email.time || new Date();
  const senderName = email?.user?.name || email?.sender || 'Unknown';
  const senderEmail = email?.user?.email || email?.sender_email || '';
  const subject = email.subject || 'No Subject';
  const isUnread = email.seen === 0;

  const previewText = (email.content || email.message || email.description || '')
    .replace(/<[^>]+>/g, '')
    .substring(0, 100);

  const diffInDays = dayjs().diff(dayjs(time), 'days');

  return (
    <Box sx={{ overflow: 'hidden', width: 1, ml: 2 }}>
      {/* 🚀 Top Row: Group Sender (Left) and Time (Right) */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5, width: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <ModernAvatar name={email.sender_name || email.sender_email} size={32} />
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: isUnread ? 800 : 500,
              color: isUnread ? 'text.primary' : 'text.secondary',
            }}
          >
            {senderName}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: 'text.disabled',
              display: { xs: 'none', sm: 'block' } // Hide email on very small screens to save space
            }}
          >
            {senderEmail}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            textWrap: 'nowrap',
            color: isUnread ? 'text.primary' : 'text.secondary',
            fontWeight: isUnread ? 600 : 400,
            flexShrink: 0,
            ml: 2
          }}
        >
          {diffInDays === 0 ? (
            dayjs(time).fromNow()
          ) : (
            <Stack direction="row" spacing={0.5}>
              <Typography component="span" variant="body2" sx={{ fontWeight: isUnread ? 700 : 400, color: isUnread ? '#000000' : 'text.secondary' }}>
                {dayjs(time).format('hh:mm a')}
              </Typography>
              <Typography component="span" variant="body2" sx={{ fontWeight: isUnread ? 700 : 400, color: isUnread ? '#000000' : 'text.secondary' }}>
                {diffInDays === 1 ? 'Yesterday' : dayjs(time).format('DD MMM')}
              </Typography>
            </Stack>
          )}
        </Typography>
      </Stack>

      {/* 🚀 Bottom Row: Subject + Snippet */}
      <Stack direction="row" spacing={1} alignItems="baseline">
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontWeight: isUnread ? 700 : 400,
            color: isUnread ? '#000000' : 'text.secondary',
            maxWidth: '40%' // Prevent subject from pushing the preview out
          }}
        >
          {subject}
        </Typography>

        <Typography
          variant="body2"
          noWrap
          sx={{
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1
          }}
        >
          — {previewText}
        </Typography>
      </Stack>
    </Box>
  );
};

export default EmailListItemContent;