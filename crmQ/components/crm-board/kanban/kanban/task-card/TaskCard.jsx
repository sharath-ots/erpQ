import { memo, useMemo } from 'react';
import AvatarGroup from '@mui/material/AvatarGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import IconifyIcon from 'components/base/IconifyIcon';
import Image from 'components/base/Image';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';

// 🚀 IMPORT YOUR ILLUSTRATED AVATAR
import IllustratedAvatar from '../../../IllustratedAvatar'; // Adjust this path to wherever you saved IllustratedAvatar.jsx!

const getLabelChipColor = (val) => {
  switch (val) {
    case 'feature':
      return 'primary';
    case 'issue':
      return 'warning';
    case 'bug':
      return 'error';
    default:
      return 'neutral';
  }
};

const TaskCard = memo(({ task }) => {

  const { activeFilters, searchQuery } = useKanbanContext();

  const progressValue = useMemo(() => {
    if (task.progress?.showBar) {
      return (task.progress.completed / task.progress.total) * 100;
    }

    return null;
  }, [task.progress]);

  const failsFilter = activeFilters && activeFilters.length > 0 && !activeFilters.includes(task.label);

  const matchesSearch = !searchQuery || 
      (task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.erp_raw_id && task.erp_raw_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.label && task.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const isHidden = failsFilter || !matchesSearch;

  return (
    <Card
      sx={{
        display: isHidden ? 'none' : 'block',
        borderRadius: 4,
        outline: 'none',
        bgcolor: 'background.elevation2',
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

        {progressValue !== null &&(
          <LinearProgress
            variant="determinate"
            color={progressValue === 100 ? 'success' : 'primary'}
            value={progressValue}
            sx={{ mb: 2 }}
          />
        )}

        <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: 'text.secondary' }}>
          {task.title}
        </Typography>

        <Stack spacing={1} sx={{ alignItems: 'center', direction: 'row' }}>
          {task.dueDate && (
            <Chip
              icon={<IconifyIcon icon="material-symbols:timer-outline-rounded" />}
              label={dayjs(task.dueDate).format('D MMM')}
              variant="soft"
              color="info"
            />
          )}

          {task.progress?.showData && (
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

          {task.attachmentCount && (
            <Stack sx={{ alignItems: 'center', color: 'text.secondary', direction: 'row', ml: 1 }}>
              <IconifyIcon
                icon={'material-symbols-light:attachment-rounded'}
                sx={{ fontSize: '18px !important' }}
              />
              <Typography variant="caption" sx={{ fontWeight: 500, ml: 0.5 }}>
                {task.attachmentCount}
              </Typography>
            </Stack>
          )}

          <AvatarGroup
            max={3}
            sx={{
              ml: 'auto',
              mr: 1,
              // Remove the default MUI Avatar styling so our custom one fits perfectly
              '& .MuiAvatar-root': { width: 24, height: 24, border: 'none' } 
            }}
          >
            {task.assignee?.map((user) => (
              <Tooltip title={user.name || 'Unknown User'} key={user.id || user.name}>
                {/* 🚀 USE THE ILLUSTRATED AVATAR HERE */}
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