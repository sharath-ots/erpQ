import { Button, Grid, Paper, Stack } from '@mui/material';
import paths from '@/shared-ui/routes/paths';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import AddOpportunityStepper from '../../../data/crm/AddOpportunity/AddOpportunityStepper';
import PageHeader from '@/shared-ui/components/sections/ecommerce/admin/common/PageHeader';

const AddOpportunity = () => {
  return (
    <Grid container>
      <Grid size={12}>
        <PageHeader
          title="Add New Opportunity"
          breadcrumb={[
            { label: 'Home', url: '/m/crmq/opportunity-list' },
            { label: 'Add Opportunity', active: true },
          ]}
        />
      </Grid>
      <Grid size={12}>
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <AddOpportunityStepper />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AddOpportunity;
