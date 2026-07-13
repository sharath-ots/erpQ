'use client';

import { Button, Stack, Box, Typography } from '@mui/material';
import paths from 'routes/paths';
import DashboardMenu from 'components/common/DashboardMenu';
import PageHeader from 'components/sections/ecommerce/admin/common/PageHeader';
import BottomBar from './BottomBar';
import CreateOrderAside from '../create-order/aside';
import CreateOrderContainer from '../create-order/main';

const CreateOrder = ({ orders, loading }) => {
  const currentOrder = orders && orders.length > 0 ? orders[0] : null;
  return (
    <Stack direction="column" sx={{ p: { xs: 2, md: 3 } }}>
      {/* <PageHeader
        title="Create Order"
        breadcrumb={[
          { label: 'Order list', url: paths.adminOrderList },
          { label: 'Create Order', active: true },
        ]}
        actionComponent={
          <Stack gap={1}>
            <Button variant="soft" color="neutral">
              Clear form
            </Button>
            <DashboardMenu size="medium" variant="soft" />
          </Stack>
        }
      /> */}

      {/* Added Header Component */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Submit Quotation
      </Typography>

      <Stack 
        sx={{ 
          // Force vertical stacking on ALL screen sizes
          flexDirection: 'column', 
          minHeight: '100vh', 
          gap: { xs: 3, md: 5 },
          width: '100%',
        }}
      >
        {/* MAIN CONTAINER: Takes full width */}
        <Box sx={{ width: '100%' }}>
          <CreateOrderContainer order={currentOrder} loading={loading} />
        </Box>

        {/* ASIDE: Now sits directly below the main container and takes full width */}
        {/* <Box sx={{ width: '100%' }}>
          <CreateOrderAside />
        </Box> */}

        <Box sx={{ width: '100%' }}>
          <BottomBar />
        </Box>
      </Stack>

     
    </Stack>
  );
};

export default CreateOrder;