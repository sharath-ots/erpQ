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
    <Grid container spacing={0}>
      <Grid size={12}>
        <CRMGreeting data={dashboardData?.greetingData || []} />
      </Grid>

      <Grid container size={12} sx={{ alignItems: 'stretch' }}>

        {/* Left Half (50% Width): 2x2 Grid Stack with Master Right Border */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column', borderRight: { lg: '1px solid' }, borderColor: 'divider' }}>

          {/* Top Row: 1. Total Leads, 2. New Leads */}
          <Grid container spacing={0} sx={{ flex: 1, width: '100%' }}>
            <LeadSummaryCards timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
          </Grid>

          {/* Bottom Row: 3. Conversion Potential, 4. Total Volume */}
          <Grid container spacing={0} sx={{ flex: 1, width: '100%' }}>
            {/* Slice grabs first two KPIs from API */}
            <CRMKPIs data={dashboardData?.kpiData?.slice(0, 2) || []} />
          </Grid>

        </Grid>

        {/* Right Half (50% Width): Lead Sources Chart */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%', height: '100%' }}>
            <LeadSources data={dashboardData?.leadSourcesData} />
          </Box>
        </Grid>
      </Grid>

      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Grid container spacing={0} sx={{ width: '100%', height: '100%' }}>
            {/* Grabs the remaining 4 KPIs (Active, Open Opps, Customers, Win Rate) */}
            <CRMKPIs data={dashboardData?.kpiData?.slice(2, 6) || []} />
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%', height: '100%' }}>
            <CRMGeneratedRevenue data={dashboardData?.oppTrackerData} />
          </Box>
        </Grid>
      </Grid>

      <Grid container size={12} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <AcquisitionCost />
        </Grid>
      </Grid>

      <Grid container size={12} sx={{ mt: 4 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <CustomerFeedback data={dashboardData?.commFlowData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
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