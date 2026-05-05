'use client';

import { useRef } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import useToggleChartLegends from 'hooks/useToggleChartLegends';
import ChartLegend from 'components/common/ChartLegend';
import DashboardMenu from 'components/common/DashboardMenu';
import CustomerFeedbackChart from './CustomerFeedbackChart';

const chartLegends = [
  { label: 'Received', color: 'chGreen.400' },
  { label: 'Sent', color: 'chRed.500' },
];

const CustomerFeedback = ({ data }) => {
  const chartRef = useRef(null);
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);

  const safeData = data || { received: [], sent: [], meetings: [] };

  return (
    <Paper sx={{ p: { xs: 3, md: 5 }, height: 1 }}>
      <Stack direction="column" sx={{ rowGap: 4, height: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ rowGap: 3, flexWrap: 'wrap' }}>
          <div>
            <Typography variant="h6" mb={1}>Communication Flow</Typography>
            <Typography variant="body2" color="text.secondary">Incoming vs Outgoing communications</Typography>
          </div>
          <DashboardMenu />
        </Stack>

        <Stack sx={{ flex: 1, gap: 2, mb: -2, mt: -1 }}>
          {chartLegends.map((legend) => (
            <ChartLegend key={legend.label} label={legend.label} color={legend.color} isActive={legendState[legend.label]} handleClick={() => handleLegendToggle(legend.label)} />
          ))}
        </Stack>

        <CustomerFeedbackChart data={safeData} sx={{ minHeight: { xs: 300, xl: 'unset' }, flex: 1 }} ref={chartRef} />
      </Stack>
    </Paper>
  );
};

export default CustomerFeedback;