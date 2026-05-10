'use client';

import { useState, useEffect } from 'react';
import {
  Avatar,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import dayjs from 'dayjs';
import { cssVarRgba } from 'lib/utils';
import DateRangePicker from 'components/base/DateRangePicker';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledTextField from 'components/styled/StyledTextField';

// 🚀 1. WE ADDED THE MISSING PROPS TO THIS LINE:
const CRMGreeting = ({ data }) => {
  const [userName, setUserName] = useState('Captain');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedName = localStorage.getItem('erp_user_name');
        if (savedName) {
          setUserName(savedName);
          return;
        }
        const response = await fetch('/api/erp-test');
        const result = await response.json();
        if (result && result.data) {
          const name = result.data.first_name || result.data.full_name || 'Captain';
          setUserName(name);
          localStorage.setItem('erp_user_name', name);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <Paper background={1} sx={{ px: { xs: 3, md: 5 }, py: 3 }}>
      <Stack
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ columnGap: { lg: 3, xl: 5 }, rowGap: 1, flexDirection: { xs: 'column', lg: 'row' } }}
      >
        <div>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Good Evening, {userName}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ pb: 1 }}>
            See what's happening in real-time
          </Typography>
        </div>

        <Stack
          sx={{
            flex: 1,
            gap: 4,
            alignItems: { sm: 'center' }, // Center icons and picker vertically
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <List
            disablePadding
            sx={{ display: 'flex', rowGap: 1, columnGap: { xs: 2, lg: 6 }, flexWrap: 'wrap' }}
          >
            {data.map(({ label, icon, count, percentage, trend }) => (
              <ListItem
                key={label}
                disableGutters
                disablePadding
                sx={{ gap: 1, width: 'max-content', alignItems: 'flex-end', justifyContent: 'flex-start', whiteSpace: 'nowrap' }}
              >
                <ListItemAvatar sx={{ minWidth: 0 }}>
                  <Avatar sx={{ bgcolor: ({ vars }) => cssVarRgba(vars.palette.primary.mainChannel, 0.12), width: 32, height: 32 }}>
                    <IconifyIcon icon={icon} sx={{ fontSize: 16, color: 'primary.dark' }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  disableTypography
                  primary={<><Typography variant="h5" fontWeight={500}>{count}</Typography><Typography variant="body2" fontWeight={500} color="text.secondary">{label}</Typography></>}
                  secondary={<Typography variant="subtitle2" color={trend === 'up' ? 'success' : 'warning'} sx={{ ml: 0.5, fontWeight: 600 }}>{percentage}% <IconifyIcon icon={trend === 'up' ? 'material-symbols:keyboard-double-arrow-up-rounded' : 'material-symbols:keyboard-double-arrow-down-rounded'} fontSize={16} sx={{ verticalAlign: 'bottom' }} /></Typography>}
                  sx={{ m: 0, flexGrow: 0, display: 'flex', gap: 0.5, alignItems: 'baseline' }}
                />
              </ListItem>
            ))}
          </List>

          {/* 🚀 2. WRAPPER FOR PICKER AND TOGGLE */}
          {/* <Stack direction="row" spacing={2} alignItems="center">
            <DateRangePicker
              dateFormat="d MMM, yy"
              isClearable
              placeholderText="Select Date Range"
              defaultStartDate={dayjs().subtract(7, 'day').toDate()}
              defaultEndDate={dayjs().toDate()}
              customInput={
                <StyledTextField
                  size="large"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconifyIcon icon="material-symbols:calendar-month-outline-rounded" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              }
              sx={{ width: 1, maxWidth: { sm: 280 } }}
            />
          </Stack> */}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default CRMGreeting;