'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { users } from 'data/users';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import { useTheme, useMediaQuery, IconButton } from '@mui/material';
import paths from '@/shared-ui/routes/paths';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import PageBreadcrumb from '@/shared-ui/components/sections/common/PageBreadcrumb';
import CRMDropdownMenu from '@/shared-ui/components/sections/crm/common/CRMDropdownMenu';

const OpportunityDetailsHeader = ({ opportunityName, opportunityId }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [starred, setStarred] = useState(false);

    const router = useRouter();
    //const { id } = router.query;
    // const { down } = useBreakpoints();

    // const downSm = down('sm');
    // const downMd = down('md');
    const theme = useTheme();
    const downSm = useMediaQuery(theme.breakpoints.down('sm'));
    const downMd = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Paper background={1} sx={{ px: { xs: 3, md: 5 }, py: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Stack direction="column" gap={2}>
                    <PageBreadcrumb
                        items={[
                            { label: 'Back', url: '/m/crmq/opportunity-list' },
                            { label: 'Opportunity Details', active: true },
                        ]}
                        sx={{ mb: 2 }}
                    />
                    <Stack direction="row" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                            {opportunityName ? opportunityName.substring(0, 2).toUpperCase() : 'OP'}
                        </Avatar>
                        <Typography variant="h4">
                            {opportunityName || 'Unnamed Opportunity'}
                        </Typography>
                        <IconButton onClick={() => setStarred(!starred)}>
                            <IconifyIcon
                                icon="material-symbols:star-rate-rounded"
                                sx={{ fontSize: 24, color: starred ? 'warning.main' : 'action.disabled' }}
                            />
                        </IconButton>
                    </Stack>
                </Stack>
                <Stack gap={1}>
                    <Button
                        variant="soft"
                        shape={downSm ? 'square' : undefined}
                        color="neutral"
                        sx={{ gap: 0.5 }}
                        onClick={() => router.push(`/m/crmq/edit-opportunity/${opportunityId}`)}
                    >
                        <IconifyIcon icon="material-symbols:edit-outline" />
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Edit information
                        </Box>
                    </Button>

                    {/* <Button
                        variant="soft"
                        shape={downSm ? 'square' : undefined}
                        color="neutral"
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                        sx={{ gap: 0.5 }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            More Action
                        </Box>
                        <IconifyIcon icon="material-symbols:expand-more" />
                    </Button> */}

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

export default OpportunityDetailsHeader;
