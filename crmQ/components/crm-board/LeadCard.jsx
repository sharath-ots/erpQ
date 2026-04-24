import React from 'react';
import { Box, Typography, Chip, Avatar, Card, Stack } from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';

// Helper to assign icons and colors based on action type
const getActionUI = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('mail') || t.includes('email')) {
        return { icon: 'material-symbols:mail-rounded', color: 'secondary.main', bg: 'secondary.softBg', border: 'secondary.main' };
    }
    if (t.includes('event') || t.includes('meeting')) {
        return { icon: 'material-symbols:calendar-month-rounded', color: 'info.main', bg: 'info.softBg', border: 'info.main' };
    }
    if (t.includes('call')) {
        return { icon: 'material-symbols:call-rounded', color: 'success.main', bg: 'success.softBg', border: 'success.main' };
    }
    // Default / Task
    return { icon: 'material-symbols:task-alt-rounded', color: 'warning.main', bg: 'warning.softBg', border: 'warning.main' };
};

const LeadCard = ({ lead, onDragStart }) => {
    const actionUI = getActionUI(lead.nextActionType);

    return (
        <Card
            draggable
            onDragStart={onDragStart}
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                bgcolor: 'background.paper',
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04)', // Clean SaaS shadow
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'grab',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.08)'
                }
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Chip
                    label={lead.source || 'Direct'}
                    size="small"
                    color="primary"
                    variant="soft"
                    sx={{ fontSize: '0.65rem', fontWeight: 700, height: 22, borderRadius: 1.5 }}
                />
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                    ${(lead.value || 0).toLocaleString()}
                </Typography>
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                {lead.company}
            </Typography>

            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2, mt: 0.5 }}>
                {lead.contact}
            </Typography>

            {lead.nextActionTitle && (
                <Box sx={{
                    p: 1.25,
                    bgcolor: actionUI.bg,
                    borderRadius: 2,
                    borderLeft: `3px solid`,
                    borderLeftColor: actionUI.border,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 'auto' // Pushes this block to the bottom if the card gets taller
                }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <IconifyIcon icon={actionUI.icon} sx={{ fontSize: 14, color: actionUI.color }} />
                        <Typography sx={{
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: actionUI.color,
                            fontSize: '0.65rem',
                            letterSpacing: '0.5px'
                        }}>
                            {lead.nextActionType || 'Task'}
                        </Typography>
                    </Stack>

                    <Typography sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                        {lead.nextActionTitle.replace(/<[^>]*>?/gm, '')}
                    </Typography>
                </Box>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} pt={1.5} borderTop="1px dashed" borderColor="divider">
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                    {lead.stage}
                </Typography>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                    {lead.contact?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
            </Stack>
        </Card>
    );
};

export default LeadCard;