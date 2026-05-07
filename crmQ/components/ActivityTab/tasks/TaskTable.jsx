import { Chip, TableRow, TableCell, TableBody, Table, TableContainer, Box, Typography, Stack, tableCellClasses, IconButton, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import IconifyIcon from 'components/base/IconifyIcon';

// 🚀 Changed to return standard MUI colors instead of hardcoded hex!
const getPriorityColor = (p) => {
  if (p === 'High') return 'error';
  if (p === 'Medium') return 'warning';
  return 'default';
};

const TaskTable = ({ taskList, onViewTask }) => {
  if (!taskList || taskList.length === 0) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" color="text.disabled">No tasks found.</Typography></Box>;

  return (
    <TableContainer>
      <Table size="small" sx={{ [`& .${tableCellClasses.root}`]: { borderBottom: 1, borderColor: 'divider', py: 1.5 } }}>
        <TableBody>
          {taskList.map((task) => (
            <TableRow key={task.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>

              <TableCell sx={{ pl: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" sx={{
                    fontWeight: 700,
                    color: task.completed ? 'text.disabled' : 'text.primary',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}>
                    {task.title || 'Untitled Task'}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                      {task.dueDate ? `Due: ${dayjs(task.dueDate).format('DD MMM')}` : 'No Due Date'}
                    </Typography>
                  </Stack>
                </Stack>
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mr: 1 }}>
                    {dayjs(task.timeStamp).format('hh:mm a')}
                  </Typography>

                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => onViewTask(task)} sx={{ bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.focus' } }}>
                      <IconifyIcon icon="material-symbols:visibility-outline-rounded" fontSize="1rem" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TaskTable;