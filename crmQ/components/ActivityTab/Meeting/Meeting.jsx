import Avatar, { avatarClasses } from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip'; // 🚀 Added for Status
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';

dayjs.extend(isToday);

// 🚀 Accept onOpenModal as a prop
const Meeting = ({ date, meeting, isToday, onOpenModal }) => {
  return (
    <Stack
      // 🚀 Trigger the modal when clicked, passing the raw Frappe data
      onClick={() => meeting.rawEventData && onOpenModal(meeting.rawEventData)}
      gap={2}
      sx={{
        alignItems: 'flex-start',
        bgcolor: 'background.elevation1',
        p: 2,
        borderRadius: 6,
        // 🚀 Add hover effects so it feels clickable
        cursor: meeting.rawEventData ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': meeting.rawEventData ? { bgcolor: 'action.hover' } : {}
      }}
    >
      <Box sx={{ borderRadius: 2, minWidth: 65, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', textAlign: 'center', color: 'common.white', py: 0.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {dayjs(date).format('MMM')}
          </Typography>
        </Box>
        <Stack direction="column" sx={{ alignItems: 'center', bgcolor: 'background.default', pt: 0.5, pb: 1 }}>
          <Typography variant="h5" sx={{ color: 'text.secondary' }}>
            {dayjs(date).format('D')}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            {dayjs(date).format('ddd')}
          </Typography>
        </Stack>
      </Box>
      <Stack direction="column" gap={{ xs: 2, sm: 0 }} sx={{ flexGrow: 1, width: '100%' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1}
          sx={{ py: { sm: 2 }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="column" gap={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">
                {meeting.participant === 'Event' ? meeting.rawEventData?.subject : `Meeting with ${meeting.participant}`}
              </Typography>
              {/* 🚀 Show the Open/Closed Status if it exists */}
              {meeting.rawEventData?.status && (
                <Chip
                  label={meeting.rawEventData.status}
                  size="small"
                  color={meeting.rawEventData.status === 'Open' ? 'primary' : 'default'}
                  variant="soft"
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: '18px' }}>
              Scheduled by <Box component="span" sx={{ fontWeight: 700 }}>{meeting.scheduledBy}</Box> at {dayjs(meeting.scheduledDate).format('h:mm a')}
            </Typography>
          </Stack>

          <AvatarGroup max={4} sx={{ mx: { sm: 1 }, [`& .${avatarClasses.root}`]: { width: 32, height: 32, fontSize: 14 } }}>
            {meeting.guests?.map((guest) => (
              <Tooltip key={guest.id} title={guest.name}>
                <Avatar src={guest.avatar} />
              </Tooltip>
            ))}
          </AvatarGroup>
        </Stack>
        {isToday && (
          <Button variant="soft" href="#!" sx={{ alignSelf: 'flex-start' }} onClick={(e) => e.stopPropagation()}>
            Join now
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default Meeting;