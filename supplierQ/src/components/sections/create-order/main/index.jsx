import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Skeleton,
  Autocomplete,
  InputAdornment,
  Divider
} from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import CreateOrderItem from './CreateOrderItem';
import CreateOrderPaymentSummary from './CreateOrderPaymentSummary';
import { fetchOptions, submitSupplierQuotation } from '../../../../services/supplierMetrics.js'; 

const CreateOrderContainer = ({ order, loading, isEditMode, onSave }) => {
  const router = useRouter();
  const [createOrderItems, setCreateOrderItems] = useState([]);
  
  // FIX 1: Added addresses and termsOptions to state
  const [options, setOptions] = useState({ 
    taxCategories: [], 
    shippingRules: [], 
    incoterms: [],
    addresses: [],
    termsOptions: []
  });
  const [submitting, setSubmitting] = useState(false);

  const [formFields, setFormFields] = useState({
    quotationNumber: '',
    date: new Date().toISOString().split('T')[0],
    validTill: '',
    companyAddress: '',
    shippingAddress: '',
    taxCategory: '',
    shippingRule: '',
    incoterm: '',
    incotermPlace: '',
    tcName: '', // FIX 2: Added state for Terms and Conditions Doctype Link
    terms: '' 
  });

  useEffect(() => {
    const loadOptions = async () => {
      // FIX 3: Fetch Address and Terms and Conditions doctypes from ERPNext
      const [tax, ship, inc, addr, terms] = await Promise.all([
        fetchOptions("Tax Category"),
        fetchOptions("Shipping Rule"),
        fetchOptions("Incoterm"),
        fetchOptions("Address"), 
        fetchOptions("Terms and Conditions")
      ]);
      setOptions({ 
        taxCategories: tax, 
        shippingRules: ship, 
        incoterms: inc,
        addresses: addr,
        termsOptions: terms 
      });
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (order) {
      if (order.items) setCreateOrderItems(order.items);
      
      setFormFields({
        quotationNumber: order.quotationNumber || '',
        date: order.date || new Date().toISOString().split('T')[0],
        validTill: order.validTill || '',
        companyAddress: order.companyAddress || '',
        shippingAddress: order.shippingAddress || '',
        taxCategory: order.taxCategory || '',
        shippingRule: order.shippingRule || '',
        incoterm: order.incoterm || '',
        incotermPlace: order.incotermPlace || '',
        tcName: order.tcName || '', // Map tcName on edit
        terms: order.terms || ''
      });
    }
  }, [order]);

  const handleChange = (field) => (event, newValue) => {
    setFormFields(prev => ({ ...prev, [field]: newValue ?? event.target.value }));
  };

  const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = { ...formFields, items: createOrderItems };
            if (isEditMode) {
                await onSave(payload); 
            } else {
                await submitSupplierQuotation(payload); 
            }
            router.push('/m/supplierq/list/supplier-quotation');
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: 1, 
        flex: 1, 
        p: { xs: 3, md: 5 }, 
        borderRadius: 4, 
        // HIGHLIGHT FIX: Made the border thicker and colored it with primary.main
        border: '2px solid', 
        borderColor: 'primary.main',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.05)'
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Stack direction="column" spacing={5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Quotation Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mb={3}>
              <TextField 
                fullWidth 
                label="Quotation Number" 
                placeholder="e.g. QTN-001" 
                value={formFields.quotationNumber}
                onChange={handleChange('quotationNumber')}
              />
              <TextField 
                fullWidth 
                label="Date" 
                type="date" 
                value={formFields.date}
                onChange={handleChange('date')}
                InputLabelProps={{ shrink: true }} 
              />
              <TextField 
                fullWidth 
                label="Valid Till" 
                type="date" 
                value={formFields.validTill}
                onChange={handleChange('validTill')}
                InputLabelProps={{ shrink: true }} 
              />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Search to edit the item configuration
            </Typography>
            <TextField
              fullWidth
              id="searchItem" 
              type="search"
              label="Search for an item..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="material-symbols:search-rounded" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Stack
            direction="column"
            spacing={3}
            divider={<Divider flexItem orientation="horizontal" />}
          >
            {loading ? (
              <>
                <Skeleton variant="rounded" height={100} />
                <Skeleton variant="rounded" height={100} />
              </>
            ) : createOrderItems.length === 0 ? (
              <Typography color="text.secondary" textAlign="center">
                No items found for this order.
              </Typography>
            ) : (
              createOrderItems.map((item) => (
                <CreateOrderItem 
                  key={item.id} 
                  orderItem={item} 
                  setOrderItems={setCreateOrderItems} 
                />
              ))
            )}
          </Stack>

          <Divider />

          <Box>
            <CreateOrderPaymentSummary items={createOrderItems} />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Taxes and Charges
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Autocomplete
                fullWidth
                options={options.taxCategories}
                value={formFields.taxCategory}
                onChange={handleChange('taxCategory')}
                renderInput={(params) => <TextField {...params} label="Tax Category" />}
              />
              <Autocomplete
                fullWidth
                options={options.shippingRules}
                value={formFields.shippingRule}
                onChange={handleChange('shippingRule')}
                renderInput={(params) => <TextField {...params} label="Shipping Rule" />}
              />
              <Autocomplete
                fullWidth
                options={options.incoterms}
                value={formFields.incoterm}
                onChange={handleChange('incoterm')}
                renderInput={(params) => <TextField {...params} label="Incoterm" />}
              />
            </Stack>

            {formFields.incoterm && (
              <Box sx={{ mt: 3 }}>
                <TextField 
                  fullWidth 
                  label="Named Place for Incoterm" 
                  placeholder="Enter specific place for incoterm..."
                  value={formFields.incotermPlace}
                  onChange={(e) => setFormFields(prev => ({ ...prev, incotermPlace: e.target.value }))}
                />
              </Box>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Address Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <TextField 
                fullWidth 
                multiline 
                rows={3} 
                label="Company Address Details" 
                placeholder="Enter billing/company address..." 
                value={formFields.companyAddress}
                onChange={handleChange('companyAddress')}
              />
              <TextField 
                fullWidth 
                multiline 
                rows={3} 
                label="Shipping Address Details" 
                placeholder="Enter delivery destination..." 
                value={formFields.shippingAddress}
                onChange={handleChange('shippingAddress')}
              />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Terms and Conditions
            </Typography>
            <TextField 
              fullWidth 
              multiline 
              rows={4} 
              label="Terms and Conditions" 
              placeholder="Enter payment terms, delivery conditions, or special notes..." 
              value={formFields.terms}
              onChange={handleChange('terms')}
            />
          </Box>

          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" color="neutral" onClick={() => router.back()}>Cancel</Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              {submitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Quotation')}
            </Button>
          </Box>

        </Stack>
      </Box>
    </Paper>
  );
};

export default CreateOrderContainer;