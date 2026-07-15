'use client';

import { useRouter } from 'next/navigation';
import { Button, Stack, Box, Typography, IconButton } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import paths from 'routes/paths';
import DashboardMenu from 'components/common/DashboardMenu';
import PageHeader from 'components/sections/ecommerce/admin/common/PageHeader';
import BottomBar from './BottomBar';
import CreateOrderAside from '../create-order/aside';
import CreateOrderContainer from '../create-order/main';

const CreateOrder = ({ orders, loading, isEditMode, onSave }) => {
  const router = useRouter();
  const currentOrder = orders && orders.length > 0 ? orders[0] : null;
  return (
    <Stack direction="column" sx={{ p: { xs: 2, md: 3 }, alignItems: 'center' }}>
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

      {/* Centered Standard Width Container */}
      <Box sx={{ width: '100%', maxWidth: '1000px' }}>
        
        {/* Header Component with Back Button */}
        <Stack direction="row" alignItems="center" gap={2} mb={3}>
          <IconButton 
            onClick={() => router.back()} 
            sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}
          >
            <IconifyIcon icon="material-symbols:arrow-back-rounded" />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            New Quotation
          </Typography>
        </Stack>

      <Stack 
          sx={{ 
            flexDirection: 'column', 
            minHeight: '100vh', 
            gap: { xs: 3, md: 5 },
            width: '100%',
          }}
        >
          {/* MAIN CONTAINER */}
          <Box sx={{ width: '100%' }}>
            <CreateOrderContainer order={currentOrder} loading={loading} isEditMode={isEditMode} onSave={onSave} />
          </Box>
        </Stack>
      </Box>

        {/* ASIDE: Now sits directly below the main container and takes full width */}
        {/* <Box sx={{ width: '100%' }}>
          <CreateOrderAside />
        </Box> */}

        {/* <Box sx={{ width: '100%' }}>
          <BottomBar />
        </Box> */}
      {/* </Stack> */}

     
    </Stack>
  );
};

export default CreateOrder;