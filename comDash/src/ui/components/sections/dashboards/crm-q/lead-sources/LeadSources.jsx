'use client';

import { useRef } from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import useToggleChartLegends from 'hooks/useToggleChartLegends';
import DashboardMenu from 'components/common/DashboardMenu';
import SectionHeader from 'components/common/SectionHeader';
import LeadSourcesChart from './LeadSourcesChart';

const palette = ['chBlue.400', 'chOrange.400', 'chLightBlue.300', 'chGreen.400', 'chRed.400', 'chPurple.400'];

const LeadSources = ({ data }) => {
  const chartRef = useRef(null);
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);
  const safeData = data || [];

  // Dynamically generate legends based on the ERPNext data
  const chartLegends = safeData.map((item, index) => ({
    label: item.name,
    color: palette[index % palette.length]
  }));

  return (
    <Paper sx={{ height: 1, p: { xs: 3, md: 5 } }}>
      <Stack direction="column" height={1}>
        <SectionHeader title="Lead Sources" subTitle="Generated leads by source" actionComponent={<DashboardMenu />} sx={{ mb: 0, flex: 1 }} />

        <Stack direction="column">
          <Box sx={{ position: 'relative' }}>
            <LeadSourcesChart data={safeData} ref={chartRef} sx={{ height: '215px !important' }} />
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Typography variant="h4">
                {safeData.reduce((acc, item) => acc + item.value, 0)}
              </Typography>
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