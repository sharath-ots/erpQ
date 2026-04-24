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
        border: '1px solid #f1f5f9',
        bgcolor: '#ffffff',
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
          bgcolor: '#f8fafc',
          '&:hover': { bgcolor: '#f1f5f9' }
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconifyIcon
            icon="material-symbols:keyboard-arrow-down-rounded"
            sx={{
              fontSize: 24,
              color: '#64748b',
              transform: !open ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'all 0.2s',
            }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
            {tasksData?.title}
          </Typography>
          <Typography variant="caption" sx={{ bgcolor: '#e2e8f0', px: 1, borderRadius: 1, fontWeight: 700, color: '#475569' }}>
            {totalTasks}
          </Typography>
        </Stack>

        {/* 🚀 Fixed Progress Layout */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 150 }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {noOfCompletedTasks}/{totalTasks} DONE
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{ borderRadius: 10, height: 6, bgcolor: '#e2e8f0' }}
            />
          </Box>
        </Stack>
      </Stack>

      <Collapse in={open}>
        <Box sx={{ p: 1 }}>
          {/* 🚀 2. Pass it down to the table here */}
          <TaskTable taskList={taskList} onViewTask={onViewTask} />
        </Box>
      </Collapse>
    </Stack>
  );
};

export default TaskList;