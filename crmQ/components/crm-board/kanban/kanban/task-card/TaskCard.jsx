import { memo } from 'react'; 
import AvatarGroup from '@mui/material/AvatarGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
// import LinearProgress from '@mui/material/LinearProgress'; // 🚀 Commented out progress
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import IconifyIcon from 'components/base/IconifyIcon';
import Image from 'components/base/Image';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';

// 🚀 IMPORT YOUR ILLUSTRATED AVATAR
import IllustratedAvatar from '../../../IllustratedAvatar'; 

const getLabelChipColor = (val) => {
  switch (val) {
    case 'feature': return 'primary';
    case 'issue': return 'warning';
    case 'bug': return 'error';
    default: return 'neutral';
  }
};

const TaskCard = memo(({ task }) => {
  const { activeFilters, searchQuery } = useKanbanContext();

  // 🚀 2. PROGRESS LOGIC COMMENTED OUT
  /*
  const progressValue = useMemo(() => {
    if (task.progress?.showBar) {
      return (task.progress.completed / task.progress.total) * 100;
    }
    return null;
  }, [task.progress]);
  */

  const failsFilter = activeFilters && activeFilters.length > 0 && !activeFilters.includes(task.label);

  const matchesSearch = !searchQuery || 
      (task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.erp_raw_id && task.erp_raw_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.label && task.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const isHidden = failsFilter || !matchesSearch;

  // 🚀 3. ATTACHMENT FIX: Checks the length of the attachments array, or falls back to a count
  const attachmentCount = task.attachments?.length || task.attachmentCount || 0;

  return (
    <Card
      sx={{
        display: isHidden ? 'none' : 'block',
        borderRadius: 4,
        outline: 'none',
        bgcolor: 'background.elevation2',
        transition: 'background-color 0.2s ease', // 🚀 UX: Smooth hover transition
        '&:hover': { bgcolor: 'background.elevation3' },
      }}
    >
      {task.coverImage && (
        <CardMedia>
          <Image
            src={task.coverImage}
            alt={task.title}
            height={214}
            width={300}
            sx={{
              p: 1,
              width: 1,
              borderRadius: 4,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              objectFit: 'cover',
            }}
          />
        </CardMedia>
      )}

      <CardContent sx={{ p: 2, pb: (theme) => `${theme.spacing(2)} !important` }}>
        {task.label && (
          <Chip
            label={task.label}
            variant="soft"
            size="small"
            color={getLabelChipColor(task.label)}
            sx={{ mb: 2, textTransform: 'capitalize' }}
          />
        )}

        {/* 🚀 PROGRESS BAR COMMENTED OUT */}
        {/* {progressValue !== null &&(
          <LinearProgress
            variant="determinate"
            color={progressValue === 100 ? 'success' : 'primary'}
            value={progressValue}
            sx={{ mb: 2 }}
          />
        )}
        */}

        {/* 🚀 UX: Bumped to subtitle2 and primary text color for better readability */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
          {task.title}
        </Typography>

        {/* 🚀 UX: Added flexWrap and gap so things don't squash on small screens */}
        <Stack sx={{ alignItems: 'center', direction: 'row', flexWrap: 'wrap', gap: 1 }}>
          
          {/* 🚀 1. SHOW FOLLOW UP DATE */}
          {task.followUpDate && (
            <Tooltip title="Follow Up Date">
              <Chip
                icon={<IconifyIcon icon="material-symbols:timer-outline-rounded" />}
                label={dayjs(task.followUpDate).format('D MMM')}
                variant="soft"
                color="info"
                size="small"
              />
            </Tooltip>
          )}

          {/* 🚀 PROGRESS FRACTION COMMENTED OUT */}
          {/* {task.progress?.showData && (
            <Stack sx={{ alignItems: 'center', color: 'text.secondary', direction: 'row', ml: 1 }}>
              <IconifyIcon
                icon={'material-symbols-light:check-box-outline'}
                sx={{ fontSize: '18px !important' }}
              />
              <Typography
                variant="caption"
                sx={{ fontWeight: 500, ml: 0.5 }}
              >{`${task.progress.completed}/${task.progress.total}`}</Typography>
            </Stack>
          )}
          */}

          {/* 🚀 3. ATTACHMENT ICON & COUNT RENDER */}
          {attachmentCount > 0 && (
            <Tooltip title={`${attachmentCount} Attachment${attachmentCount > 1 ? 's' : ''}`}>
              <Stack sx={{ alignItems: 'center', color: 'text.secondary', direction: 'row', ml: 1 }}>
                <IconifyIcon
                  icon={'material-symbols-light:attachment-rounded'}
                  sx={{ fontSize: '18px !important' }}
                />
                <Typography variant="caption" sx={{ fontWeight: 500, ml: 0.5 }}>
                  {attachmentCount}
                </Typography>
              </Stack>
            </Tooltip>
          )}

          <AvatarGroup
            max={3}
            sx={{
              ml: 'auto',
              '& .MuiAvatar-root': { width: 24, height: 24, border: 'none' } 
            }}
          >
            {task.assignee?.map((user) => (
              <Tooltip title={user.name || 'Unknown User'} key={user.id || user.name}>
                <div style={{ 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  width: 24, 
                  height: 24, 
                  border: '2px solid white', 
                  marginLeft: -8 
                }}>
                  <IllustratedAvatar name={user.avatarSeed || user.name || user.id} size={24} />
                </div>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Stack>
      </CardContent>
    </Card>
  );
});

export default TaskCard;