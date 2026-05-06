'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// Import your working Zoho Hook
import { useZohoWorkdrive } from 'services/swr/api-hooks/useZohoWorkdrive';

import IconifyIcon from 'components/base/IconifyIcon';
import FileItem from './FileItem';

const RecentFiles = () => {
  const [open, setOpen] = useState(true);
  
  // Fetch the live data
  const { files: zohoFiles, isLoading, isError } = useZohoWorkdrive();

  // Sort Zoho files by date (newest first) and grab the top 5
  const recentZohoFiles = Array.isArray(zohoFiles) 
    ? [...zohoFiles]
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, 5) 
    : [];

  return (
    <Box sx={{ mt: 3, mb: 5 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1, p: '0 !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontSize: { xs: 20, md: 24 } }}>
            Recent Files
          </Typography>
          <Button
            size="small"
            variant="text"
            color="secondary"
            endIcon={<IconifyIcon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} />}
            onClick={() => setOpen(!open)}
            sx={{ px: 2, borderRadius: 10, bgcolor: 'background.paper' }}
          >
            {open ? 'Collapse' : 'Expand'}
          </Button>
        </Box>

        <Collapse in={open} timeout="auto" unmountOnExit>
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            
            {isLoading ? (
               <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
               </Box>
            ) : isError || recentZohoFiles.length === 0 ? (
               <Typography align="center" color="text.secondary" sx={{ p: 4 }}>
                 No recent files found.
               </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
                  gap: 2,
                }}
              >
                {recentZohoFiles.map((file) => (
                   <FileItem key={file.id} file={file} />
                ))}
              </Box>
            )}

          </Paper>
        </Collapse>
      </Container>
    </Box>
  );
};

export default RecentFiles;