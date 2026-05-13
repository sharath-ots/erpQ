'use client';

import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import PageLoader from 'components/loading/PageLoader';

import CRMGreeting from 'components/sections/dashboards/crm-q/CRMGreeting';
import CRMKPIs from 'components/sections/dashboards/crm-q/kpi/CRMKPIs';
import CRMGeneratedRevenue from 'components/sections/dashboards/crm-q/generated-revenue/CRMGeneratedRevenue';
import CustomerFeedback from 'components/sections/dashboards/crm-q/customer-feedback/CustomerFeedback';
import LeadSources from 'components/sections/dashboards/crm-q/lead-sources/LeadSources';
import LeadSummaryCards from '../../../../../../../crmQ/components/crm-dashboard/LeadSummaryCards';
import AcquisitionCost from 'components/sections/dashboards/crm-q/acquisition-cost/AcquisitionCost';
import ActiveUsers from 'components/sections/dashboards/crm-q/active-users/ActiveUsers';
import AvgLifetimeValue from 'components/sections/dashboards/crm-q/avg-lifetime-value/AvgLifetimeValue';
import SaleFunnel from 'components/sections/dashboards/crm-q/sale-funnel/SaleFunnel';

const CRMQ = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/crm-q-dashboard');
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Grid container spacing={0} sx={{ borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'divider' }}>
      <Grid size={12}>
        <CRMGreeting data={dashboardData?.greetingData || []} />
      </Grid>

      {/* Row 1 */}
      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        {/* Removed borderRight from the Grid size container below */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={0} sx={{ flex: 1 }}>
            <LeadSummaryCards timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
          </Grid>
          <Grid container spacing={0} sx={{ flex: 1 }}>
            <CRMKPIs data={dashboardData?.kpiData?.slice(0, 2) || []} />
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%', borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider' }}>
            <LeadSources data={dashboardData?.leadSourcesData} />
          </Box>
        </Grid>
      </Grid>

      {/* Row 2 */}
      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Grid container spacing={0} sx={{ width: '100%' }}>
            <CRMKPIs data={dashboardData?.kpiData?.slice(2, 6) || []} />
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%', borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider' }}>
            <CRMGeneratedRevenue data={dashboardData?.oppTrackerData} />
          </Box>
        </Grid>
      </Grid>

      {/* Row 3: Customer Acquisition Cost - FULL WIDTH FIX */}
      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        <Grid
          size={12} // 🚀 Changed from 6 to 12 to span right to left
          sx={{
            display: 'flex',
            borderRight: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <AcquisitionCost />
        </Grid>
      </Grid>

      {/* Row 4: Communication Flow & Monthly Active Users - PERFECT 50/50 SPLIT */}
      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        <Grid
          size={{ xs: 12, lg: 6 }} // 🚀 Exactly half (6/12)
          sx={{
            display: 'flex',
            borderRight: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <CustomerFeedback data={dashboardData?.commFlowData} />
        </Grid>

        <Grid
          size={{ xs: 12, lg: 6 }} // 🚀 Exactly half (6/12)
          sx={{
            display: 'flex',
            borderBottom: '1px solid',
            borderRight: '1px solid',
            borderColor: 'divider'
          }}
        >
          <ActiveUsers />
        </Grid>
      </Grid>

      <Grid size={12}>
        <SaleFunnel
          data={dashboardData?.funnelData?.chartData}
          tableData={dashboardData?.funnelData?.tableData}
        />
      </Grid>

      <Grid size={12}>
        <AvgLifetimeValue />
      </Grid>
    </Grid>
  );
};

export default CRMQ;