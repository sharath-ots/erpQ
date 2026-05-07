import { Dialog, DialogTitle, DialogContent, Stack, Typography, Box, Divider, Chip, IconButton } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import dayjs from 'dayjs';

const DetailRow = ({ label, value, icon }) => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
        <IconifyIcon icon={icon} sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
        <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {value || 'N/A'}
            </Typography>
        </Box>
    </Stack>
);

const TaskDetailsDialog = ({ open, onClose, task }) => {
    if (!task) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="text.primary">Task Details</Typography>
                <IconButton onClick={onClose}><IconifyIcon icon="material-symbols:close" /></IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={1}>
                    {/* Main Info */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800 }}>DESCRIPTION</Typography>
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 500, color: 'text.primary' }}>
                            {task.title}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <DetailRow label="Status" value={task.status} icon="material-symbols:check-circle-outline" />
                        <DetailRow label="Priority" value={task.priority} icon="material-symbols:low-priority-rounded" />
                        <DetailRow label="Due Date" value={task.dueDate ? dayjs(task.dueDate).format('DD MMM YYYY') : 'None'} icon="material-symbols:calendar-today" />
                        <DetailRow label="Allocated To" value={task.allocated_to} icon="material-symbols:person-outline" />
                        <DetailRow label="Assigned By" value={task.assigned_by_full_name || task.assigned_by} icon="material-symbols:verified-user-outline" />
                        <DetailRow label="Reference" value={`${task.reference_type}: ${task.reference_name}`} icon="material-symbols:link" />
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsDialog;