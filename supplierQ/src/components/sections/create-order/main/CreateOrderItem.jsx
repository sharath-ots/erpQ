'use client';

import { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Link, 
  Stack, 
  textFieldClasses, 
  Typography, 
  TextField, 
  InputAdornment,
  Modal,
  Backdrop,
  Fade,
  Paper,
  CircularProgress
} from '@mui/material';
import paths from 'routes/paths';
import IconifyIcon from 'components/base/IconifyIcon';
import Image from 'components/base/Image';
import QuantityButtons from 'components/sections/ecommerce/customer/common/QuantityButtons';
import ItemVariant from './ItemVariant';

// Import the new fetch helper! Adjust the path if necessary.
import { fetchItemDetails, fetchLinkedTitle } from '../../../../services/supplierMetrics.js';

// Strict INR formatting function
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Helper component for clean modal rows
const DetailRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" py={1.5} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} textAlign="right" sx={{ maxWidth: '60%', wordBreak: 'break-word' }}>
      {value !== undefined && value !== null && value !== '' ? value : '—'}
    </Typography>
  </Stack>
);

const CreateOrderItem = ({ orderItem, setOrderItems }) => {
  const { id, images, variants, quantity, price, name } = orderItem;

  // Find UOM from variants array
  const uomVariant = variants?.find(v => v.label === 'UOM')?.value || 'N/A';

  // Modal State
  const [open, setOpen] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (!itemDetails) {
      setDetailsLoading(true);
      try {
        const data = await fetchItemDetails(id);
        
        if (data) {
          const [systemName, subSystemName, typeOfItemName] = await Promise.all([
            data.system ? fetchLinkedTitle("System", data.system) : null,
            data.sub_system ? fetchLinkedTitle("Sub System", data.sub_system) : null,
            data.type_of_item ? fetchLinkedTitle("Type of Item", data.type_of_item) : null,
          ]);

          setItemDetails({
            ...data,
            system: systemName || data.system,
            sub_system: subSystemName || data.sub_system,
            type_of_item: typeOfItemName || data.type_of_item
          });
        }
      } catch (error) {
        console.error("Failed to load details", error);
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const handleClose = () => setOpen(false);

  const handleQuantityChange = (quantity) => {
    setOrderItems((orderItems) =>
      orderItems.map((item) => {
        if (item.id === orderItem.id) {
          return { ...item, quantity };
        }
        return item;
      }),
    );
  };

  const handlePriceChange = (event) => {
    const val = event.target.value;
    const newPrice = val === '' ? '' : Number(val);
    
    setOrderItems((orderItems) =>
      orderItems.map((item) => {
        if (item.id === orderItem.id) {
          return {
            ...item,
            price: { ...item.price, regular: newPrice }
          };
        }
        return item;
      }),
    );
  };

  return (
    <>
      <Stack spacing={3} justifyContent="space-between">
        <Stack spacing={3} direction={{ xs: 'column', lg: 'row' }}>
          <Box
            sx={{
              position: 'relative',
              width: 73,
              height: 73,
              flexShrink: 0,
              bgcolor: 'background.elevation1',
              borderRadius: 4,
            }}
          >
            <Image src={images[0].src} alt="" fill sx={{ objectFit: 'contain' }} />
          </Box>

          <Stack direction="column" spacing={3} sx={{ flexGrow: 1 }}>
            <Stack
              spacing={3}
              direction={{ xs: 'column', xl: 'row' }}
              sx={{ justifyContent: 'space-between' }}
            >
              <Stack direction="column" spacing={2}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    lineClamp: 2,
                  }}
                >
                  <Link
                    component="button"
                    onClick={handleOpen}
                    sx={{
                      color: 'currentcolor',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      verticalAlign: 'baseline',
                      p: 0
                    }}
                  >
                    {name}
                  </Link>
                </Typography>
                
                {/* REPLACED: "Sold by" with UOM value */}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {uomVariant}
                  </Box>
                </Typography>
              </Stack>

              <Stack
                direction="column"
                spacing={2}
                sx={{
                  alignItems: {
                    xs: 'flex-start',
                    xl: 'flex-end',
                  },
                }}
              >
                <QuantityButtons
                  defaultValue={quantity}
                  handleChange={handleQuantityChange}
                  sx={{
                    [`& .${textFieldClasses.root}`]: {
                      width: 56,
                    },
                  }}
                />
                
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Rate"
                    value={price.regular} 
                    onChange={handlePriceChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      sx: { fontSize: '0.875rem', height: 32 }
                    }}
                    sx={{ width: 110 }}
                  />
                  
                  <Typography variant="subtitle2" sx={{ color: 'text.disabled' }}>
                    x{quantity}
                  </Typography>
                  
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatINR((Number(price.regular) || 0) * quantity)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              {variants?.map((variant) => (
                <ItemVariant key={variant.label} variant={variant} />
              ))}
            </Stack>
          </Stack>
        </Stack>

        <IconButton sx={{ alignSelf: 'flex-start' }}>
          <IconifyIcon icon="material-symbols:close" sx={{ fontSize: 20, color: 'neutral.dark' }} />
        </IconButton>
      </Stack>

      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: { timeout: 500 },
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Fade in={open} mountOnEnter unmountOnExit>
          <Paper
            sx={{
              width: { xs: '100%', sm: 500, md: 600 },
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 4,
              p: 4,
              outline: 'none',
              position: 'relative'
            }}
          >
            <IconButton 
              onClick={handleClose} 
              sx={{ position: 'absolute', top: 16, right: 16 }}
            >
              <IconifyIcon icon="material-symbols:close" sx={{ fontSize: 24 }} />
            </IconButton>

            <Typography id="transition-modal-title" variant="h5" component="h2" fontWeight={700} mb={3}>
              Item Details
            </Typography>

            {detailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : itemDetails ? (
              <Stack direction="column">
                <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: 'center' }}>
                  <Box sx={{ position: 'relative', width: 100, height: 100, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Image src={images[0].src} alt={itemDetails.item_name} fill sx={{ objectFit: 'contain' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{itemDetails.item_code}</Typography>
                    <Typography variant="body2" color="text.secondary">{itemDetails.item_name}</Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                  Classification
                </Typography>
                <Box mb={3}>
                  <DetailRow label="Item Group" value={itemDetails.item_group} />
                  <DetailRow label="Variant Of" value={itemDetails.variant_of} />
                  <DetailRow label="System" value={itemDetails.system} />
                  <DetailRow label="Sub System" value={itemDetails.sub_system} />
                  <DetailRow label="Type of Item" value={itemDetails.type_of_item} />
                </Box>

                {/* <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                  Inventory & Settings
                </Typography>
                <Box mb={3}>
                  <DetailRow label="Default Unit of Measure" value={itemDetails.stock_uom} />
                  <DetailRow label="Valuation Rate" value={formatINR(itemDetails.valuation_rate)} />
                  <DetailRow label="Disabled" value={itemDetails.disabled === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Allow Alternative Item" value={itemDetails.allow_alternative_item === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Maintain Stock" value={itemDetails.is_stock_item === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Has Variants" value={itemDetails.has_variants === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Is Fixed Asset" value={itemDetails.is_fixed_asset === 1 ? 'Yes' : 'No'} />
                </Box>

                <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                  Allowances
                </Typography>
                <Box mb={3}>
                  <DetailRow label="Over Delivery/Receipt Allowance (%)" value={`${itemDetails.over_delivery_receipt_allowance || 0}%`} />
                  <DetailRow label="Over Billing Allowance (%)" value={`${itemDetails.over_billing_allowance || 0}%`} />
                </Box> */}

                {itemDetails.description && (
                  <>
                    <Typography variant="subtitle2" color="primary.main" fontWeight={700} textTransform="uppercase" mb={1}>
                      Description
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Typography variant="body2" dangerouslySetInnerHTML={{ __html: itemDetails.description }} />
                    </Paper>
                  </>
                )}
              </Stack>
            ) : (
              <Typography color="error">Failed to load item details.</Typography>
            )}
          </Paper>
        </Fade>
      </Modal>
    </>
  );
};

export default CreateOrderItem;