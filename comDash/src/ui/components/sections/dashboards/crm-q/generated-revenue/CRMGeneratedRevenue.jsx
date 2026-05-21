'use client';

import { useRef } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import useToggleChartLegends from 'hooks/useToggleChartLegends';
import ChartLegend from 'components/common/ChartLegend';
import DashboardMenu from 'components/common/DashboardMenu';
import CRMGeneratedRevenueChart from './CRMGeneratedRevenueChart';

const chartLegends = [
  { label: 'Lost', color: 'chGrey.200' },
  { label: 'Converted', color: 'chGreen.400' },
  { label: 'Open', color: 'chBlue.500' },
];

const CRMGeneratedRevenue = ({ data }) => {
  const chartRef = useRef(null);
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);

  const safeData = data || { categories: [], lost: [], converted: [], open: [] };

  return (
    // 🚀 FIX: Set borderRadius: 0, boxShadow: 'none', and width: 1 to fill the grid cell
    <Paper sx={{ p: { xs: 3, md: 5 }, height: 1, width: 1, borderRadius: 0, boxShadow: 'none', bgcolor: 'transparent' }}>
      <Stack direction="column" sx={{ rowGap: 4, height: 1, width: 1 }}>
        <Stack sx={{ columnGap: { xs: 5, lg: 2, xl: 5 }, rowGap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: 'space-between' }}>
          <div>
            <Typography variant="h6" mb={1}>Opportunity Status Tracker</Typography>
            <Typography variant="body2" color="text.secondary">Opps created over the last 7 weeks</Typography>
          </div>

          <Stack direction="row" sx={{ flex: 1, flexBasis: { xs: '100%', sm: 0 }, order: { xs: 1, sm: 0 }, alignSelf: 'flex-end', justifyContent: 'flex-end', gap: 2 }}>
            {chartLegends.map((legend) => (
              <ChartLegend key={legend.label} label={legend.label} color={legend.color} isActive={legendState[legend.label]} handleClick={() => handleLegendToggle(legend.label)} />
            ))}
          </Stack>
          <DashboardMenu />
        </Stack>

        {/* 🚀 FIX: Add width: 1 to the chart sx */}
        <CRMGeneratedRevenueChart data={safeData} sx={{ minHeight: { xs: 300, xl: 'unset' }, flex: 1, width: 1 }} ref={chartRef} />
      </Stack>
    </Paper>
  );
};

export default CRMGeneratedRevenue;