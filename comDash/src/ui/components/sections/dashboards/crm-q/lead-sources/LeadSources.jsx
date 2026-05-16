'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useRouter, usePathname } from 'next/navigation'; // 🚀 Added Navigation
import useToggleChartLegends from 'hooks/useToggleChartLegends';
import DashboardMenu from 'components/common/DashboardMenu';
import SectionHeader from 'components/common/SectionHeader';
import LeadSourcesChart from './LeadSourcesChart';

const generateColor = (index) => {
  const defaultColors = ['#4A90E2', '#F39C12', '#2ECC71', '#E74C3C', '#9B59B6', '#1ABC9C', '#F1C40F', '#34495E', '#E67E22', '#7F8C8D'];
  if (index < defaultColors.length) return defaultColors[index];
  return `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
};

const LeadSources = ({ data }) => {
  const chartRef = useRef(null);
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);
  const safeData = data || [];

  // 🚀 Hooks Setup
  const router = useRouter();
  const pathname = usePathname();

  // 🚀 Navigation Handler for Chart Slices
  const handleNavigate = useCallback((sourceName) => {
    const filters = [{ field: 'source', operator: '=', value: sourceName }];
    const basePath = pathname.startsWith('/m/crmq') ? '/m/crmq/lead-list' : '/crmq/lead-list';
    router.push(`${basePath}?filters=${encodeURIComponent(JSON.stringify(filters))}`);
  }, [pathname, router]);

  // 🚀 Bulletproof Click Binding directly to the ECharts instance
  useEffect(() => {
    let instance = null;
    if (chartRef.current) {
      instance = typeof chartRef.current.getEchartsInstance === 'function'
        ? chartRef.current.getEchartsInstance()
        : chartRef.current;
    }

    if (instance && typeof instance.on === 'function') {
      const clickHandler = (params) => {
        // Only route if they clicked an actual slice with a name
        if (params.name) {
          handleNavigate(params.name);
        }
      };

      // Attach the event (clearing old ones to prevent duplicate firing)
      instance.off('click', clickHandler);
      instance.on('click', clickHandler);

      return () => {
        if (instance && typeof instance.off === 'function') {
          instance.off('click', clickHandler);
        }
      };
    }
  }, [handleNavigate, safeData]);

  const chartLegends = useMemo(() => {
    return safeData.map((item, index) => ({
      label: item.name,
      color: generateColor(index)
    }));
  }, [safeData]);

  const chartColors = chartLegends.map(l => l.color);

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

            {/* 🚀 Pass onEvents down just in case the wrapper supports it natively */}
            <LeadSourcesChart
              data={safeData}
              colors={chartColors}
              ref={chartRef}
              onEvents={{ click: (params) => handleNavigate(params.name) }}
              sx={{ height: '215px !important' }}
            />

            {/* 🚀 Added pointerEvents: 'none' so clicking the text in the middle doesn't block the chart click */}
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
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