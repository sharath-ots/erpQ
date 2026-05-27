'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation'; 
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
  const router = useRouter(); 
  const { legendState, handleLegendToggle } = useToggleChartLegends(chartRef);

  const safeData = data || { categories: [], lost: [], converted: [], open: [] };

  const handleChartClick = (seriesName, categoryName) => {
    let statusFilter = [];
    
    // 1. Add the Status filter
    if (seriesName === 'Lost') {
      statusFilter.push({ field: 'status', operator: 'in', value: 'Lost, Completed, Hold, Closed' });
    } else if (seriesName === 'Converted') {
      statusFilter.push({ field: 'status', operator: 'in', value: 'Converted, Won' });
    } else if (seriesName === 'Open') {
      statusFilter.push({ field: 'status', operator: '=', value: 'Open' });
    }

    // 2. 🚀 NEW: Calculate the exact Date of the bar clicked
    const catIndex = safeData.categories.indexOf(categoryName);
    if (catIndex !== -1) {
        const daysAgo = (safeData.categories.length - 1) - catIndex;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        
        // Format to YYYY-MM-DD
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const targetDateString = `${year}-${month}-${day}`;
        
        statusFilter.push({ field: 'creation', operator: '=', value: targetDateString });
    }

    const filterString = encodeURIComponent(JSON.stringify(statusFilter));
    const url = `/m/crmq/opportunity-list?filters=${filterString}`;

    router.push(url);
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 5 }, height: 1, width: 1, borderRadius: 0, boxShadow: 'none', bgcolor: 'transparent' }}>
      <Stack direction="column" sx={{ rowGap: 4, height: 1, width: 1 }}>
        <Stack sx={{ columnGap: { xs: 5, lg: 2, xl: 5 }, rowGap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: 'space-between' }}>
          <div>
            <Typography variant="h6" mb={1}>Opportunity Status Tracker</Typography>
            <Typography variant="body2" color="text.secondary">Opps created over the last 7 days</Typography>
          </div>

          <Stack direction="row" sx={{ flex: 1, flexBasis: { xs: '100%', sm: 0 }, order: { xs: 1, sm: 0 }, alignSelf: 'flex-end', justifyContent: 'flex-end', gap: 2 }}>
            {chartLegends.map((legend) => (
              <ChartLegend key={legend.label} label={legend.label} color={legend.color} isActive={legendState[legend.label]} handleClick={() => handleLegendToggle(legend.label)} />
            ))}
          </Stack>
          <DashboardMenu />
        </Stack>

        <CRMGeneratedRevenueChart 
           data={safeData} 
           sx={{ minHeight: { xs: 300, xl: 'unset' }, flex: 1, width: 1 }} 
           ref={chartRef} 
           onChartClick={handleChartClick} 
        />
      </Stack>
    </Paper>
  );
};

export default CRMGeneratedRevenue;