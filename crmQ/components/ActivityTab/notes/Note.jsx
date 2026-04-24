import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import IconifyIcon from 'components/base/IconifyIcon';

// 🚀 Activate the plugin to allow ordinal dates (1st, 2nd, 20th)
dayjs.extend(advancedFormat);

const Note = ({ note }) => {
  return (
    <Stack
      direction="row"
      gap={2}
      sx={{
        py: 2.5,
        px: 2,
        borderBottom: '1px solid #f1f5f9',
        '&:hover': { bgcolor: '#f8fafc' },
        transition: 'background-color 0.2s'
      }}
    >
      {/* 🚀 Sleek Frappe-style Avatar */}
      <Avatar
        src={note.author.avatar || undefined}
        sx={{
          width: 36,
          height: 36,
          bgcolor: '#d1fae5', // Soft green background
          color: '#047857',   // Dark green text
          fontSize: '1rem',
          fontWeight: 600
        }}
      >
        {note.author.name ? note.author.name.charAt(0).toUpperCase() : 'U'}
      </Avatar>

      <Stack direction="column" gap={1.5} flexGrow={1}>
        {/* Header Row */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">

          {/* Author & Exact Frappe Date Format */}
          <Stack direction="column" spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {note.author.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              {/* 🚀 format('Do MMMM YYYY, hh:mm A') outputs: "20th April 2026, 07:22 PM" */}
              {dayjs(note.createdAt).format('Do MMMM YYYY, hh:mm A')}
            </Typography>
          </Stack>

          {/* Actions (Edit / Delete) stacked vertically on the far right */}
          {/* <Stack direction="column" spacing={0.5}>
            <IconButton size="small" sx={{ p: 0.5, color: '#94a3b8', '&:hover': { color: '#0f172a', bgcolor: 'transparent' } }}>
              <IconifyIcon icon="material-symbols:edit-outline" sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.5, color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'transparent' } }}>
              <IconifyIcon icon="material-symbols:delete-outline" sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack> */}

        </Stack>

        {/* Note Body */}
        <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap', pr: 4 }}>
          {note.description}
        </Typography>
      </Stack>
    </Stack>
  );
};

export default Note;