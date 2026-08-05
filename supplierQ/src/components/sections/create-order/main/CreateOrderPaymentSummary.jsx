'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { inputBaseClasses } from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledTextField from 'components/styled/StyledTextField';

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const CreateOrderPaymentSummary = ({ items }) => {
  const [discountType, setDiscountType] = useState('%');
  
  // FIX: Converted discountAmount to an editable state initialized to an empty string.
  const [discountInput, setDiscountInput] = useState('');
  
  // Kept shipping cost logic intact but initialized to 0. 
  // You can adjust this if a shipping cost API field is added later.
  const shippingCost = 0; 

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.price?.regular) || 0) * (Number(item.quantity) || 0), 0);
  }, [items]);

  // FIX: Calculate total cleanly taking the editable discount state into account
  const finalTotal = useMemo(() => {
    const parsedDiscount = parseFloat(discountInput) || 0;
    let computedTotal = subtotal + shippingCost;
    
    if (discountType === '%') {
      computedTotal = computedTotal - (computedTotal * parsedDiscount) / 100;
    } else {
      computedTotal = computedTotal - parsedDiscount;
    }
    
    return computedTotal > 0 ? computedTotal : 0;
  }, [subtotal, shippingCost, discountType, discountInput]);

  return (
    <Box
      sx={{
        bgcolor: 'background.elevation1',
        borderRadius: 6,
        p: 3,
      }}
    >
      <PriceSummaryRow label="Subtotal" value={subtotal} sx={{ mb: 2 }} />
      {/* <PriceSummaryEditableRow
        label="Add Shipping cost"
        action={
          <StyledTextField
            value={formatINR(shippingCost)}
            sx={{
              width: 84,
              [`& .${inputBaseClasses.input}`]: {
                textAlign: 'right',
              },
            }}
          />
        }
        labelStyles={{ lineClamp: 0, wordBreak: 'normal', mt: 0.25 }}
        sx={{ mb: 3, gap: 1, alignItems: 'flex-start' }}
      /> */}
      
      <PriceSummaryEditableRow
        label="Add Discount"
        action={
          <Stack
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}
          >
            <ToggleButtonGroup
              exclusive
              value={discountType}
              onChange={(_, value) => {
                if (value !== null) {
                  setDiscountType(value);
                }
              }}
              sx={{ p: 0, gap: 0.5 }}
            >
              <ToggleButton value="%" sx={{ width: 40 }}>
                <IconifyIcon
                  icon="material-symbols:percent-rounded"
                  sx={{ fontSize: 20, color: 'text.primary' }}
                />
              </ToggleButton>
              <ToggleButton value="₹" sx={{ width: 40 }}>
                <IconifyIcon
                  icon="material-symbols:currency-rupee-rounded"
                  sx={{ fontSize: 20, color: 'text.primary' }}
                />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* FIX: Bound the TextField to the state and provided an onChange handler */}
            <StyledTextField
              type="number"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              sx={{
                width: 84,
                [`& .${inputBaseClasses.input}`]: {
                  textAlign: 'right',
                },
              }}
            />
          </Stack>
        }
        labelStyles={{ lineClamp: 'unset', textWrap: 'nowrap', overflow: 'unset', mt: 0.25 }}
        sx={{ mb: 3, gap: 1, alignItems: 'flex-start' }}
      />

      <Stack
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Total
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {formatINR(finalTotal)}
        </Typography>
      </Stack>
    </Box>
  );
};

const PriceSummaryRow = ({ label, value, labelStyles, sx }) => {
  return (
    <Stack
      sx={{ justifyContent: 'space-between', alignItems: 'center', color: 'text.secondary', ...sx }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, lineClamp: 1, wordBreak: 'break-all', ...labelStyles }}
      >
        {label}
      </Typography>
      <Typography variant="subtitle1">{formatINR(value)}</Typography>
    </Stack>
  );
};

const PriceSummaryEditableRow = ({ label, action, labelStyles, sx }) => {
  return (
    <Stack
      sx={{ justifyContent: 'space-between', alignItems: 'center', color: 'text.secondary', ...sx }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, lineClamp: 1, wordBreak: 'break-all', ...labelStyles }}
      >
        {label}
      </Typography>
      {action}
    </Stack>
  );
};

export default CreateOrderPaymentSummary;