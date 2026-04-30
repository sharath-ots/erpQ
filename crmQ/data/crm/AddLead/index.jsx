import { Button, Grid, Paper, Stack } from '@mui/material';
import paths from '@/shared-ui/routes/paths';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import AddLeadStepper from '../AddLead/AddLeadStepper';
import PageHeader from '@/shared-ui/components/sections/ecommerce/admin/common/PageHeader';

const AddLead = () => {
  return (
    <Grid container>
      <Grid size={12}>
        <PageHeader
          title="Add New Lead"
          breadcrumb={[
            { label: 'Home', url: '/m/crmq/lead-list' },
            { label: 'Add Lead', active: true },
          ]}
        // actionComponent={
        //   <Stack gap={1}>
        //     <Button
        //       variant="soft"
        //       size="large"
        //       color="neutral"
        //       startIcon={
        //         <IconifyIcon icon="material-symbols:upload-rounded" height={24} width={24} />
        //       }
        //     >
        //       Import From
        //     </Button>
        //   </Stack>
        // }
        />
      </Grid>
      <Grid size={12}>
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <AddLeadStepper />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AddLead;
