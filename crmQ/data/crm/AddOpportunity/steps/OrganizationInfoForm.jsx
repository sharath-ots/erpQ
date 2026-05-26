import { useFormContext } from 'react-hook-form';
import { Box, Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import * as yup from 'yup';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';
import { useERPDropdown } from '../../../../src/hooks/useERPDropdown';

export const orgInfoSchema = yup.object().shape({
  orgInfo: yup.object({
    // company: yup.string().required('Company is Required'),
    // customerGroup: yup.string().optional(),
    territory: yup.string().optional(),
    industry: yup.string().optional(),
    marketSegment: yup.string().optional(),
    noOfEmployees: yup.string().optional(),
    annualRevenue: yup.number().transform((value, originalValue) => (originalValue === "" ? null : value)).nullable().optional(),
    website: yup.string().url('Invalid URL').optional(),
    city: yup.string().optional(),
    state: yup.string().optional(),
    country: yup.string().optional(),
  }),
});

const employeeOptions = [
  { value: '1-10', label: '1-10' }, { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' }, { value: '201-500', label: '201-500' },
  { value: '501-1000', label: '501-1000' }, { value: '1000+', label: '1000+' }
];

const OrganizationInfoForm = ({ label }) => {
  const { register, control, formState: { errors } } = useFormContext();
  
  // 🚀 Call the hook
  const { options: industryOptions } = useERPDropdown('Industry Type');
  const { options: marketSegmentOptions } = useERPDropdown('Market Segment');

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>

      <Stack direction="column" spacing={4}>
        <ContactFormSection title="Organization Details">
          <Grid container spacing={2} sx={{ width: 1 }}>
            {/* <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company (Internal) *" error={!!errors.orgInfo?.company} helperText={errors.orgInfo?.company?.message} {...register('orgInfo.company')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Customer Group" {...register('orgInfo.customerGroup')} />
            </Grid> */}
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* 🚀 Replaced TextField with ControlledSelect */}
              <ControlledSelect name="orgInfo.industry" label="Industry" options={industryOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ControlledSelect name="orgInfo.noOfEmployees" label="No of Employees" options={employeeOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label="Annual Revenue" {...register('orgInfo.annualRevenue')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Website URL" {...register('orgInfo.website')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Market & Location">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Territory" {...register('orgInfo.territory')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* 🚀 Replaced TextField with ControlledSelect */}
              <ControlledSelect name="orgInfo.marketSegment" label="Market Segment" options={marketSegmentOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="City" {...register('orgInfo.city')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="State/Province" {...register('orgInfo.state')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Country" {...register('orgInfo.country')} />
            </Grid>
          </Grid>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default OrganizationInfoForm;