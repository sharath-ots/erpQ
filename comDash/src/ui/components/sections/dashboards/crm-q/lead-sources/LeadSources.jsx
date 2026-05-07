'use client';

import { useRef, useMemo } from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import useToggleChartLegends from 'hooks/useToggleChartLegends';
import DashboardMenu from 'components/common/DashboardMenu';
import SectionHeader from 'components/common/SectionHeader';
import LeadSourcesChart from './LeadSourcesChart';

// Infinite Dynamic Color Generator
const generateColor = (index) => {
  const defaultColors = ['#4A90E2', '#F39C12', '#2ECC71', '#E74C3C', '#9B59B6', '#1ABC9C', '#F1C40F', '#34495E', '#E67E22', '#7F8C8D'];
  if (index < defaultColors.length) return defaultColors[index];
  return `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Creates distinct colors infinitely
};

const LeadSources = ({ data }) => {
  const chartRef = useRef(null);
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);
  const safeData = data || [];

  // Generate perfect matching colors for however many sources exist
  const chartLegends = useMemo(() => {
    return safeData.map((item, index) => ({
      label: item.name,
      color: generateColor(index)
    }));
  }, [safeData]);

  // Extract just the color strings to pass to the chart
  const chartColors = chartLegends.map(l => l.color);

  // Dynamic total calculation
  const displayTotal = safeData.reduce((acc, item) => {
    const isHidden = legendState[item.name];
    return isHidden ? acc : acc + item.value;
  }, 0);

  return (
    <Paper sx={{ height: 1, p: { xs: 3, md: 5 } }}>
      <Stack direction="column" height={1}>
        <SectionHeader title="Lead Sources" subTitle="Generated leads by source" actionComponent={<DashboardMenu />} sx={{ mb: 0, flex: 1 }} />

        <Stack direction="column">
          <Box sx={{ position: 'relative' }}>
            {/* We pass our dynamic chartColors array directly into the chart! */}
            <LeadSourcesChart data={safeData} colors={chartColors} ref={chartRef} sx={{ height: '215px !important' }} />

            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Typography variant="h4">{displayTotal}</Typography>
            </Box>
          </Box>

          <Grid container spacing={{ xs: 1, sm: 3, md: 1, lg: 3 }} sx={{ alignItems: 'center' }}>
            {chartLegends.map(({ label, color }) => (
              <Grid key={label} size={{ xs: 3, sm: 6, md: 3 }}>
                <ButtonBase disableRipple onClick={() => handleLegendToggle(label)} sx={{ width: 1, alignItems: 'flex-start', flexDirection: 'column', opacity: legendState[label] ? 0.5 : 1 }}>
                  <Typography variant="caption" noWrap color="text.secondary" sx={{ textOverflow: 'ellipsis', maxWidth: 1, mb: 1 }}>{label}</Typography>
                  <Box sx={{ width: 1, height: 8, bgcolor: color, borderRadius: 0.5 }} />
                </ButtonBase>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default LeadSources;