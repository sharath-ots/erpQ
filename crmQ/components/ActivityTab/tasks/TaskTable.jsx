import { Chip, Checkbox, TableRow, TableCell, TableBody, Table, TableContainer, Box, Typography, Stack, tableCellClasses, IconButton, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import IconifyIcon from 'components/base/IconifyIcon';

const getPriorityColor = (p) => {
  if (p === 'High') return { bg: '#fee2e2', text: '#991b1b' };
  if (p === 'Medium') return { bg: '#fef3c7', text: '#92400e' };
  return { bg: '#f1f5f9', text: '#475569' };
};

const TaskTable = ({ taskList, onViewTask }) => {
  if (!taskList || taskList.length === 0) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" color="text.disabled">No tasks found.</Typography></Box>;

  return (
    <TableContainer>
      <Table size="small" sx={{ [`& .${tableCellClasses.root}`]: { borderBottom: '1px solid #f1f5f9', py: 1.5 } }}>
        <TableBody>
          {taskList.map((task) => (
            <TableRow key={task.id} sx={{ '&:hover': { bgcolor: '#fcfcfd' } }}>
              {/* <TableCell padding="checkbox">
                <Checkbox checked={task.completed} size="small" />
              </TableCell> */}

              <TableCell sx={{ pl: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" sx={{
                    fontWeight: 700,
                    color: task.completed ? 'text.disabled' : '#1e293b',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}>
                    {/* 🚀 Show a clean title (first 40 chars of description) */}
                    {task.title || 'Untitled Task'}
                  </Typography>

                  {/* 🚀 NEW: Subtext for a quick description peek */}
                  {/* <Typography variant="caption" noWrap sx={{ color: 'text.secondary', maxWidth: 300, display: 'block' }}>
                    {task.description_raw || 'No additional details.'}
                  </Typography> */}

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={task.priority} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, bgcolor: getPriorityColor(task.priority).bg, color: getPriorityColor(task.priority).text }} />
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

                  {/* 🚀 NEW: VIEW BUTTON */}
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => onViewTask(task)} sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
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