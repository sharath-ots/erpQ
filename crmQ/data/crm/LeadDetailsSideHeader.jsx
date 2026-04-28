'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// 🚀 EXPERT FIX: Added the missing IconButton import
import IconButton from '@mui/material/IconButton';
import { useTheme, useMediaQuery } from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import CRMDropdownMenu from '@/shared-ui/components/sections/crm/common/CRMDropdownMenu';

const LeadDetailsSideHeader = ({ leadName, leadCRMId }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [starred, setStarred] = useState(false);

    const router = useRouter();
    const theme = useTheme();
    const downMd = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Paper elevation={0} sx={{ px: 3, py: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>

                {/* LEFT: Lead Name & Star */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {leadName || 'Unnamed Lead'}
                    </Typography>
                    <IconButton size="small" onClick={() => setStarred(!starred)}>
                        {/* Example Star Icon - Uncomment to use */}
                        {/* <IconifyIcon icon={starred ? "material-symbols:star-rate-rounded" : "material-symbols:star-outline-rounded"} color={starred ? "#f59e0b" : "action.active"} /> */}
                    </IconButton>
                </Stack>

                {/* RIGHT: Action Buttons Grouped Side-by-Side */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        size={downMd ? 'small' : 'medium'}
                        color="inherit"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        onClick={() => router.push(`/crm/lead-list/edit/${leadCRMId}`)}
                        startIcon={<IconifyIcon icon="material-symbols:edit-outline" />}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>Edit</Box>
                    </Button>

                    <Button
                        variant="contained"
                        size={downMd ? 'small' : 'medium'}
                        color="primary"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                        onClick={() => router.push(`/m/crmq/lead-list/${leadCRMId}`)}
                    >
                        View Full Details
                    </Button>

                    <CRMDropdownMenu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        handleClose={() => setAnchorEl(null)}
                    />
                </Stack>
            </Stack>
        </Paper>
    );
};

export default LeadDetailsSideHeader;