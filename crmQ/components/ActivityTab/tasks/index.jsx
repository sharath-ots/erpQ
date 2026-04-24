import { useState, useEffect } from 'react';
import {
  Box, Button, Container, Stack, Dialog, DialogTitle,
  DialogContent, TextField, MenuItem, DialogActions,
  FormControlLabel, Checkbox, Typography, Chip
} from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import SimpleBar from 'components/base/SimpleBar';
import TaskList from './TaskList';
import TaskDetailsDialog from './TaskDetailsDialog';

const TaskTabPanel = ({ leadId }) => {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  const [newTask, setNewTask] = useState({
    date: '',
    assign_to_me: false,
    assign_to: [],
    assign_to_user_group: '',
    description: '',
    attachments: []
  });

  // 🚀 Replaced hardcoded array with empty state
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState(['Sales Team', 'Support', 'Management']);

  const fetchTasks = async () => {
    const res = await fetch(`/api/lead/tasks?leadId=${leadId}`);
    const rawData = await res.json();

    const formattedTasks = rawData.map(t => {
      let rawText = t.subject || t.description || 'No Description';
      let cleanTitle = rawText.replace(/<[^>]*>?/gm, '');

      return {
        ...t,
        id: t.name || t.id,
        title: cleanTitle,
        completed: t.status === 'Closed' || t.status === 'Cancelled',
        dueDate: t.date || t.expected_end_date,
        timeStamp: t.modified || t.creation
      };
    });

    setTasks(formattedTasks);
    setLoading(false);
  };

  // 🚀 Fetch real users from your API
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/system-users'); // Adjust this path if you named your API file differently
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (leadId) fetchTasks();
    fetchUsers(); // Fetch users on mount
  }, [leadId]);

  const handleAddTask = async () => {
    const payload = { ...newTask };

    payload.assign_to = payload.assign_to.join(', ');

    if (payload.assign_to_me) {
      payload.assign_to = 'Administrator';
    }

    const res = await fetch(`/api/lead/tasks?leadId=${leadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setOpen(false);
      fetchTasks();
      setNewTask({ date: '', assign_to_me: false, assign_to: [], assign_to_user_group: '', description: '', attachments: [] });
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewTask(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeAttachment = (indexToRemove) => {
    setNewTask(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove)
    }));
  };

  return (
    <Container maxWidth={false} sx={{ maxWidth: 800, px: { xs: 0 } }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<IconifyIcon icon="material-symbols:add" />}
          onClick={() => setOpen(true)}
        >
          Create Task
        </Button>
      </Stack>

      <SimpleBar sx={{ maxHeight: 'calc(100vh - 250px)', px: 1 }}>
        <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
          <TaskList
            tasksData={{ title: "Pending Tasks", taskList: tasks.filter(t => t.status === 'Open') }}
            onViewTask={(task) => setSelectedTask(task)}
          />
          <TaskList
            tasksData={{ title: "Completed", taskList: tasks.filter(t => t.status !== 'Open') }}
            onViewTask={(task) => setSelectedTask(task)}
          />
        </Stack>
      </SimpleBar>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', pb: 2 }}>Assign New Task</DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#fcfcfd' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

            {/* DUE DATE */}
            <TextField
              fullWidth
              type="date"
              label="Due Date"
              InputLabelProps={{ shrink: true }}
              value={newTask.date}
              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
              sx={{ bgcolor: 'white' }}
            />

            {/* ASSIGNMENT SECTION */}
            <Box sx={{ p: 2.5, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: 'block' }}>
                Assignment
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                <TextField
                  select
                  SelectProps={{
                    multiple: true,
                    value: newTask.assign_to,
                    onChange: (e) => setNewTask({ ...newTask, assign_to: e.target.value }),
                    renderValue: (selected) => selected.join(', ')
                  }}
                  fullWidth
                  label="Assign To"
                  disabled={newTask.assign_to_me}
                  sx={{ bgcolor: 'white' }}
                >
                  {/* 🚀 Render fetched users */}
                  {users.map(user => (
                    <MenuItem key={user.name} value={user.name}>
                      <Checkbox checked={newTask.assign_to.indexOf(user.name) > -1} size="small" />
                      <Typography variant="body2">{user.full_name || user.name}</Typography>
                    </MenuItem>
                  ))}
                </TextField>

              </Box>
            </Box>

            {/* DESCRIPTION */}
            <TextField
              fullWidth
              label="Task Details (Description)"
              multiline
              rows={4}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              sx={{ bgcolor: 'white' }}
            />

            {/* ATTACHMENTS */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                startIcon={<IconifyIcon icon="material-symbols:attach-file" />}
                sx={{ bgcolor: 'white', justifyContent: 'flex-start', py: 1.5 }}
              >
                Add Attachment
                <input type="file" hidden multiple onChange={handleFileChange} />
              </Button>

              {newTask.attachments.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {newTask.attachments.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeAttachment(index)}
                      size="small"
                      sx={{ bgcolor: '#e2e8f0', justifyContent: 'space-between', px: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" sx={{ fontWeight: 700, px: 4 }}>Create Task</Button>
        </DialogActions>
      </Dialog>

      <TaskDetailsDialog
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </Container>
  );
};

export default TaskTabPanel;