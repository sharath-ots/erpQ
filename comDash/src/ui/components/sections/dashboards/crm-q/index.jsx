'use client';

import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
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
        <CRMGreeting data={dashboardData?.greetingData || []}
        />
      </Grid>
      <Grid container size={12}>
        <Grid size={{ xs: 12, md: 4 }}>
          <LeadSummaryCards timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={0} sx={{ height: '100%' }}>
            <CRMKPIs data={dashboardData?.kpiData || []} />
          </Grid>
        </Grid>
      </Grid>

      <Grid container size={12}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <LeadSources data={dashboardData?.leadSourcesData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CRMGeneratedRevenue data={dashboardData?.oppTrackerData} />
        </Grid>
      </Grid>

      <Grid size={12}>
        <AcquisitionCost />
      </Grid>

      <Grid container size={12}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <CustomerFeedback data={dashboardData?.commFlowData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ActiveUsers />
        </Grid>
      </Grid>

      <Grid size={12}>
        <SaleFunnel />
      </Grid>

      <Grid size={12}>
        <AvgLifetimeValue />
      </Grid>
    </Grid>
  );
};

export default CRMQ;