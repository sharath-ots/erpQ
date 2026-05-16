'use client';

import { Box, Paper } from '@mui/material';
import DashboardSelectMenu from 'components/common/DashboardSelectMenu';
import SectionHeader from 'components/common/SectionHeader';
import ActiveUsersChart from './ActiveUsersChart';

const ActiveUsers = ({ data }) => { // 🚀 Accept the data prop
  return (
    <Paper
      sx={{
        height: 1,
        overflow: 'hidden',
        p: { xs: 3, md: 5 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SectionHeader
        title="New Leads Generated" // 🚀 Updated Title
        subTitle="Daily lead acquisition over the selected period" // 🚀 Updated Subtitle
        sx={{ mb: { xs: 2, md: 4 } }}
        actionComponent={
          <DashboardSelectMenu
            options={[{ value: 15, label: 'Last 15 days' }]}
            defaultValue={15}
            sx={{ minWidth: 0 }}
          />
        }
      />

      <Box sx={{ overflowX: 'auto' }}>
        {/* 🚀 Pass the data into the chart */}
        <ActiveUsersChart data={data} sx={{ minHeight: 380, minWidth: 800, width: 1 }} />
      </Box>
    </Paper>
  );
};

export default ActiveUsers;