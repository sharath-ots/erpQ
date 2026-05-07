'use client';

import { useState, useEffect } from 'react';
import { Box, Collapse, LinearProgress, Stack, Typography } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import TaskTable from './TaskTable';

const TaskList = ({ tasksData, onViewTask }) => {
  const [open, setOpen] = useState(true);
  const [taskList, setTaskList] = useState(tasksData?.taskList || []);

  useEffect(() => {
    if (tasksData?.taskList) setTaskList(tasksData.taskList);
  }, [tasksData]);

  const totalTasks = taskList?.length || 0;
  const noOfCompletedTasks = taskList?.filter((task) => task.completed).length || 0;
  const progressValue = totalTasks > 0 ? (noOfCompletedTasks / totalTasks) * 100 : 0;

  return (
    <Stack
      direction="column"
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      <Stack
        role="button"
        onClick={() => setOpen(!open)}
        direction="row"
        sx={{
          p: 2,
          cursor: 'pointer',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconifyIcon
            icon="material-symbols:keyboard-arrow-down-rounded"
            sx={{
              fontSize: 24,
              color: 'text.secondary',
              transform: !open ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'all 0.2s',
            }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {tasksData?.title}
          </Typography>
          <Typography variant="caption" sx={{ bgcolor: 'action.selected', px: 1, borderRadius: 1, fontWeight: 700, color: 'text.secondary' }}>
            {totalTasks}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 150 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {noOfCompletedTasks}/{totalTasks} DONE
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{ borderRadius: 10, height: 6, bgcolor: 'action.hover' }}
            />
          </Box>
        </Stack>
      </Stack>

      <Collapse in={open}>
        <Box sx={{ p: 1 }}>
          <TaskTable taskList={taskList} onViewTask={onViewTask} />
        </Box>
      </Collapse>
    </Stack>
  );

};

export default TaskList;