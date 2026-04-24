'use client';

import { useState } from 'react';
import {
  Button, Stack, Box, Typography, Dialog, DialogTitle,
  DialogContent, IconButton, Grid, Table, TableBody, TableCell,
  TableHead, TableRow, MenuItem, Select,
  FormControlLabel, Checkbox, Divider, dialogClasses, TextField, DialogActions
} from '@mui/material';
import dayjs from 'dayjs';
import SimpleBar from '@/shared-ui/components/base/SimpleBar';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import StyledTextField from '@/shared-ui/components/styled/StyledTextField';
import MeetingList from './MeetingList';

const MeetingTabPanel = ({ meetingData, onRefresh, leadId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [tempEvent, setTempEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (event) => {
    setTempEvent(event);
    setIsNewEvent(false);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleOpenNewEvent = () => {
    setTempEvent({
      subject: '',
      status: 'Open',
      event_category: 'Meeting',
      event_type: 'Private',
      color: '#1890FF',
      all_day: 0,
      send_reminder: 0,
      repeat_this_event: 0,
      sync_with_google_calendar: 0,
      starts_on: dayjs().format('YYYY-MM-DD HH:00:00'),
      ends_on: dayjs().add(1, 'hour').format('YYYY-MM-DD HH:00:00'),
      description: '',
      notes: '',
      actions: []
      // Note: event_participants is intentionally removed from default UI state
    });
    setIsNewEvent(true);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleClose = () => {
    if (isSaving) return;
    setDialogOpen(false);
    setTempEvent(null);
  };

  const handleSave = async () => {
    if (dayjs(tempEvent.ends_on).isBefore(dayjs(tempEvent.starts_on))) {
      alert("Validation Error: 'Ends On' cannot be before 'Starts On'.");
      return;
    }

    setIsSaving(true);
    try {
      // 🚀 INVISIBLE HARDCODING: Construct participants in the background
      const hiddenParticipants = [];
      if (leadId) {
        hiddenParticipants.push({
          reference_doctype: 'Lead',
          reference_docname: leadId
        });
      }

      const payload = {
        ...tempEvent,
        subject: tempEvent.subject || 'Untitled Event',
        starts_on: dayjs(tempEvent.starts_on).format('YYYY-MM-DD HH:mm:ss'),
        ends_on: dayjs(tempEvent.ends_on).format('YYYY-MM-DD HH:mm:ss'),
        all_day: tempEvent.all_day ? 1 : 0,
        send_reminder: tempEvent.send_reminder ? 1 : 0,
        repeat_this_event: tempEvent.repeat_this_event ? 1 : 0,
        sync_with_google_calendar: tempEvent.sync_with_google_calendar ? 1 : 0,
        actions: (tempEvent.actions || []).filter(a => a.task_description?.trim()),

        // Push the invisible payload to ERPNext
        event_participants: hiddenParticipants
      };

      const url = isNewEvent ? `/api/event` : `/api/event/${tempEvent.name}`;
      const method = isNewEvent ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`API Route Error: Next.js returned HTML. Please ensure pages/api/event/index.js exists for POST requests.`);
      }

      if (!response.ok) {
        const errorMsg = result._server_messages
          ? JSON.parse(result._server_messages).map(m => JSON.parse(m)[1]).join(' ')
          : result.message || "ERP Server Error: Frappe rejected the payload.";
        throw new Error(errorMsg);
      }

      handleClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Save failed:", error);
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addActionRow = () => setTempEvent({ ...tempEvent, actions: [...(tempEvent.actions || []), { task_description: '', due_date: dayjs().format('YYYY-MM-DD'), status: 'Open' }] });
  const updateActionRow = (i, f, v) => { const a = [...tempEvent.actions]; a[i][f] = v; setTempEvent({ ...tempEvent, actions: a }); };

  const secHead = { fontSize: '0.75rem', fontWeight: 900, color: 'primary.main', textTransform: 'uppercase', mb: 2, letterSpacing: 1 };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<IconifyIcon icon="material-symbols:add-rounded" />} onClick={handleOpenNewEvent} sx={{ borderRadius: 2, fontWeight: 700 }}>Add New Event</Button>
      </Stack>

      <SimpleBar sx={{ maxHeight: 600 }}>
        <Stack direction="column" gap={3}>
          {meetingData?.map((data) => (<MeetingList key={data.id || Math.random()} meetingList={data} onOpenModal={handleOpen} />))}
        </Stack>
      </SimpleBar>

      <Dialog open={dialogOpen} onClose={handleClose} fullWidth maxWidth="lg" sx={{ [`& .${dialogClasses.paper}`]: { borderRadius: 6, m: 2 } }}>
        {tempEvent && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{isNewEvent ? 'Create New Event' : 'Update Event Details'}</Typography>
              <IconButton onClick={handleClose} sx={{ bgcolor: 'action.hover' }}><IconifyIcon icon="material-symbols:close" /></IconButton>
            </DialogTitle>

            <SimpleBar sx={{ maxHeight: '75vh', overflowX: 'hidden' }}>
              <DialogContent sx={{ p: 4 }}>

                {/* TOP ROW: 2 COLUMNS */}
                <Grid container spacing={5}>

                  {/* LEFT COLUMN: Info & Notes */}
                  <Grid item xs={12} md={6}>
                    <Stack spacing={4}>
                      <Box>
                        <Typography sx={secHead}>General Information</Typography>
                        <Stack spacing={2.5}>
                          <StyledTextField fullWidth label="Subject" disabled={!isEditing} value={tempEvent.subject || ''} onChange={(e) => setTempEvent({ ...tempEvent, subject: e.target.value })} />
                          <Grid container spacing={2}>
                            <Grid item xs={6}><StyledTextField select fullWidth label="Status" disabled={!isEditing} value={tempEvent.status || 'Open'} onChange={(e) => setTempEvent({ ...tempEvent, status: e.target.value })}><MenuItem value="Open">Open</MenuItem><MenuItem value="Completed">Completed</MenuItem><MenuItem value="Cancelled">Cancelled</MenuItem></StyledTextField></Grid>
                            <Grid item xs={6}><StyledTextField select fullWidth label="Category" disabled={!isEditing} value={tempEvent.event_category || 'Meeting'} onChange={(e) => setTempEvent({ ...tempEvent, event_category: e.target.value })}><MenuItem value="Meeting">Meeting</MenuItem><MenuItem value="Call">Call</MenuItem><MenuItem value="Demo">Demo</MenuItem></StyledTextField></Grid>
                            <Grid item xs={6}><StyledTextField select fullWidth label="Type" disabled={!isEditing} value={tempEvent.event_type || 'Private'} onChange={(e) => setTempEvent({ ...tempEvent, event_type: e.target.value })}><MenuItem value="Private">Private</MenuItem><MenuItem value="Public">Public</MenuItem></StyledTextField></Grid>
                            <Grid item xs={6}><StyledTextField fullWidth type="color" label="Color" disabled={!isEditing} value={tempEvent.color || '#1890FF'} onChange={(e) => setTempEvent({ ...tempEvent, color: e.target.value })} sx={{ '& .MuiInputBase-root': { height: 40, p: 0 } }} /></Grid>
                          </Grid>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography sx={secHead}>Description & Notes</Typography>
                        <Stack spacing={2.5}>
                          <StyledTextField fullWidth multiline rows={3} label="Description" disabled={!isEditing} value={tempEvent.description || ''} onChange={(e) => setTempEvent({ ...tempEvent, description: e.target.value })} />
                          <StyledTextField fullWidth multiline rows={3} label="Minutes of Meeting" disabled={!isEditing} value={tempEvent.notes || ''} onChange={(e) => setTempEvent({ ...tempEvent, notes: e.target.value })} />
                        </Stack>
                      </Box>
                    </Stack>
                  </Grid>

                  {/* RIGHT COLUMN: Schedule */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ position: 'sticky', top: 0 }}>
                      <Typography sx={secHead}>Date & Schedule</Typography>
                      <Stack spacing={3}>
                        <StyledTextField fullWidth type="datetime-local" label="Starts On" disabled={!isEditing} value={dayjs(tempEvent.starts_on).format('YYYY-MM-DDTHH:mm')} onChange={(e) => setTempEvent({ ...tempEvent, starts_on: e.target.value })} />
                        <StyledTextField fullWidth type="datetime-local" label="Ends On" disabled={!isEditing} value={dayjs(tempEvent.ends_on).format('YYYY-MM-DDTHH:mm')} onChange={(e) => setTempEvent({ ...tempEvent, ends_on: e.target.value })} />

                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <FormControlLabel disabled={!isEditing} control={<Checkbox size="small" checked={Boolean(tempEvent.all_day)} onChange={(e) => setTempEvent({ ...tempEvent, all_day: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>All Day Event</Typography>} />
                          <FormControlLabel disabled={!isEditing} control={<Checkbox size="small" checked={Boolean(tempEvent.send_reminder)} onChange={(e) => setTempEvent({ ...tempEvent, send_reminder: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Send email reminder</Typography>} />
                          <FormControlLabel disabled={!isEditing} control={<Checkbox size="small" checked={Boolean(tempEvent.repeat_this_event)} onChange={(e) => setTempEvent({ ...tempEvent, repeat_this_event: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Repeat this Event</Typography>} />
                          <FormControlLabel disabled={!isEditing} control={<Checkbox size="small" checked={Boolean(tempEvent.sync_with_google_calendar)} onChange={(e) => setTempEvent({ ...tempEvent, sync_with_google_calendar: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Sync Google Calendar</Typography>} />
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 4 }} />

                {/* BOTTOM ROW: ACTIONS TABLE ONLY */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={secHead} mb={0}>Action Items</Typography>
                    {isEditing && <Button size="small" variant="soft" onClick={addActionRow}>+ Add Action</Button>}
                  </Stack>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'background.neutral' }}><TableRow><TableCell sx={{ fontWeight: 700 }}>Task</TableCell><TableCell sx={{ fontWeight: 700, width: 180 }}>Due Date</TableCell><TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell></TableRow></TableHead>
                      <TableBody>
                        {tempEvent.actions?.length > 0 ? tempEvent.actions.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ py: 0.5 }}><TextField fullWidth size="small" variant="standard" InputProps={{ disableUnderline: true }} disabled={!isEditing} value={row.task_description} onChange={(e) => updateActionRow(i, 'task_description', e.target.value)} /></TableCell>
                            <TableCell sx={{ py: 0.5 }}><TextField type="date" fullWidth size="small" variant="standard" InputProps={{ disableUnderline: true }} disabled={!isEditing} value={row.due_date} onChange={(e) => updateActionRow(i, 'due_date', e.target.value)} /></TableCell>
                            <TableCell sx={{ py: 0.5 }}><Select fullWidth size="small" variant="standard" disabled={!isEditing} value={row.status || 'Open'} onChange={(e) => updateActionRow(i, 'status', e.target.value)} sx={{ '&:before, &:after': { display: 'none' } }}><MenuItem value="Open">Open</MenuItem><MenuItem value="Closed">Closed</MenuItem></Select></TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.disabled' }}>No Actions Data</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

              </DialogContent>
            </SimpleBar>

            <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Button variant="text" color="inherit" onClick={handleClose} sx={{ fontWeight: 700 }}>Discard</Button>
              {isEditing ? (
                <Button variant="contained" onClick={handleSave} disabled={isSaving} sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 700 }}>{isSaving ? 'Saving...' : 'Save to ERP'}</Button>
              ) : (
                <Button variant="contained" onClick={() => setIsEditing(true)} sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 700 }}>Edit Event</Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MeetingTabPanel;