import { Controller, useFormContext } from 'react-hook-form';
import { Box, Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import * as yup from 'yup';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';
// 🚀 Import the hook
import { useERPDropdown } from '../../../../src/hooks/useERPDropdown';

export const oppDetailsSchema = yup.object().shape({
  oppDetails: yup.object({
    namingSeries: yup.string().required('Required'),
    transactionDate: yup.string().required('Opportunity Date is Required'),
    opportunityType: yup.string().optional(),
    status: yup.string().required('Status is Required'),
    salesStage: yup.string().optional(),
    probability: yup.number().min(0).max(100).optional(),
    expectedClosing: yup.string().nullable().optional(),
    currency: yup.string().optional(),
    opportunityAmount: yup.number().transform((val, orig) => (orig === "" ? null : val)).nullable().optional(),
    conversionRate: yup.number().transform((val, orig) => (orig === "" ? null : val)).nullable().optional(),
    source: yup.string().optional(),
    campaign: yup.string().optional(),
    opportunityOwner: yup.string().optional(),
    language: yup.string().optional()
  }),
});

const statusOptions = [
  { value: 'Open', label: 'Open' }, { value: 'Quotation', label: 'Quotation' },
  { value: 'Converted', label: 'Converted' }, { value: 'Lost', label: 'Lost' },
  { value: 'Replied', label: 'Replied' }, { value: 'Closed', label: 'Closed' }
];

const seriesOptions = [
  { value: 'CRM-OPP-.YYYY.-', label: 'CRM-OPP-.YYYY.-' }
];

const OpportunityDetailsForm = ({ label }) => {
  const { register, control, formState: { errors } } = useFormContext();

  // 🚀 Fetch options dynamically
  const { options: opportunityTypeOptions } = useERPDropdown('Opportunity Type');
  const { options: salesStageOptions } = useERPDropdown('Sales Stage');
  const { options: sourceOptions } = useERPDropdown('Lead Source');
  const { options: currencyOptions } = useERPDropdown('Currency');

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>

      <Stack direction="column" spacing={4}>
        <ContactFormSection title="General">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
               <ControlledSelect name="oppDetails.namingSeries" label="Series *" options={seriesOptions} control={control} error={errors.oppDetails?.namingSeries?.message} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="oppDetails.transactionDate" control={control} render={({ field }) => (
                <DatePicker label="Opportunity Date *" sx={{ width: 1 }} value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date ? date.toISOString() : null)} 
                  slotProps={{ textField: { error: !!errors.oppDetails?.transactionDate, helperText: errors.oppDetails?.transactionDate?.message } }}
                />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <ControlledSelect name="oppDetails.status" label="Status *" options={statusOptions} control={control} error={errors.oppDetails?.status?.message} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* 🚀 Changed to ControlledSelect */}
              <ControlledSelect name="oppDetails.opportunityType" label="Opportunity Type" options={opportunityTypeOptions} control={control} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Sales Cycle">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              {/* 🚀 Changed to ControlledSelect */}
              <ControlledSelect name="oppDetails.salesStage" label="Sales Stage" options={salesStageOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="number" label="Probability (%)" {...register('oppDetails.probability')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="oppDetails.expectedClosing" control={control} render={({ field }) => (
                <DatePicker label="Expected Closing Date" sx={{ width: 1 }} value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date ? date.toISOString() : null)} />
              )} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Opportunity Value">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              {/* 🚀 Changed to ControlledSelect */}
              <ControlledSelect name="oppDetails.currency" label="Currency" options={currencyOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="number" label="Opportunity Amount" {...register('oppDetails.opportunityAmount')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="number" label="Exchange Rate" {...register('oppDetails.conversionRate')} />
            </Grid>
          </Grid>
        </ContactFormSection>
        
        <ContactFormSection title="Marketing & Ownership">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
               {/* 🚀 Changed to ControlledSelect */}
               <ControlledSelect name="oppDetails.source" label="Source" options={sourceOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Campaign Name" {...register('oppDetails.campaign')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Opportunity Owner (User)" {...register('oppDetails.opportunityOwner')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Language" {...register('oppDetails.language')} />
            </Grid>
          </Grid>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default OpportunityDetailsForm;