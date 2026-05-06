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
// Unchanged components
import AcquisitionCost from 'components/sections/dashboards/crm-q/acquisition-cost/AcquisitionCost';
import ActiveUsers from 'components/sections/dashboards/crm-q/active-users/ActiveUsers';
import AvgLifetimeValue from 'components/sections/dashboards/crm-q/avg-lifetime-value/AvgLifetimeValue';
import SaleFunnel from 'components/sections/dashboards/crm-q/sale-funnel/SaleFunnel';

const CRMQ = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <Grid container>
      <Grid size={12}>
        <CRMGreeting data={dashboardData?.greetingData || []} subtitle={dashboardData?.subtitle} />
      </Grid>

      <Grid size={12}>
        <LeadSummaryCards />
      </Grid>

      <Grid container size={12}>
        <Grid container size={{ xs: 12, lg: 5, xl: 6 }}>
          <CRMKPIs data={dashboardData?.kpiData || []} />
        </Grid>
        <Grid size={{ xs: 12, lg: 7, xl: 6 }}>
          <CRMGeneratedRevenue data={dashboardData?.oppTrackerData} />
        </Grid>
      </Grid>

      <Grid container size={12}>
        <Grid container size={{ xs: 12, xl: 8 }}>
          <Grid container size={12}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomerFeedback data={dashboardData?.commFlowData} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <LeadSources data={dashboardData?.leadSourcesData} />
            </Grid>
          </Grid>
          <Grid size={12}><AcquisitionCost /></Grid>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}><SaleFunnel /></Grid>
      </Grid>

      <Grid container size={12}>
        <Grid size={{ xs: 12, md: 6, xl: 4 }}><AvgLifetimeValue /></Grid>
        <Grid size={{ xs: 12, md: 6, xl: 8 }}><ActiveUsers /></Grid>
      </Grid>
    </Grid>
  );
};

export default CRMQ;