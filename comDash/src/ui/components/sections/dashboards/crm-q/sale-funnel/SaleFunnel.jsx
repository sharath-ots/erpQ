'use client';

import { Paper } from '@mui/material';
import Grid from '@mui/material/Grid';
import DashboardMenu from 'components/common/DashboardMenu';
import SectionHeader from 'components/common/SectionHeader';
import SaleFunnelChart from './SaleFunnelChart';
import SaleFunnelTable from './SaleFunnelTable';

const SaleFunnel = ({ data, tableData }) => {
  const safeChartData = data || [];
  const safeTableData = tableData || [];

  return (
    <Paper background={1} sx={{ height: 1, p: { xs: 3, md: 5 } }}>
      <SectionHeader
        title="Sale Funnel"
        subTitle="Macro Conversion Pipeline"
        actionComponent={<DashboardMenu />}
        sx={{ mb: 3 }}
      />
      <Grid container spacing={{ xs: 4, sm: 3, md: 4 }}>
        <Grid size={{ xs: 12, sm: 5, md: 6, xl: 12 }}>
          {/* Passes data to the new Funnel Chart */}
          <SaleFunnelChart data={safeChartData} sx={{ width: 1, height: '254px !important' }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 7, md: 6, xl: 12 }}>
          {/* Passes data to the table */}
          <SaleFunnelTable data={safeTableData} />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SaleFunnel;