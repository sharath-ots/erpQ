import Grid from '@mui/material/Grid';
import { dealsData, kpisData } from '../../../../data/crm/dashboard.js';
import CRMGreeting from './CRMGreeting.jsx';
import AcquisitionCost from './acquisition-cost/AcquisitionCost.jsx';
import ActiveUsers from './active-users/ActiveUsers.jsx';
import AvgLifetimeValue from './avg-lifetime-value/AvgLifetimeValue.jsx';
import CustomerFeedback from './customer-feedback/CustomerFeedback.jsx';
import CRMGeneratedRevenue from './generated-revenue/CRMGeneratedRevenue.jsx';
import CRMKPIs from './kpi/CRMKPIs.jsx';
import LeadSources from './lead-sources/LeadSources.jsx';
import SaleFunnel from './sale-funnel/SaleFunnel.jsx';

const CRM = () => {
  return (
    <Grid container>
      <Grid size={12}>
        <CRMGreeting data={dealsData} />
      </Grid>

      <Grid container size={12}>
        <Grid container size={{ xs: 12, lg: 5, xl: 6 }}>
          <CRMKPIs data={kpisData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 7, xl: 6 }}>
          <CRMGeneratedRevenue />
        </Grid>
      </Grid>

      <Grid container size={12}>
        <Grid container size={{ xs: 12, xl: 8 }}>
          <Grid container size={12}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomerFeedback />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <LeadSources />
            </Grid>
          </Grid>

          <Grid size={12}>
            <AcquisitionCost />
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <SaleFunnel />
        </Grid>
      </Grid>

      <Grid container size={12}>
        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <AvgLifetimeValue />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 8 }}>
          <ActiveUsers />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default CRM;
