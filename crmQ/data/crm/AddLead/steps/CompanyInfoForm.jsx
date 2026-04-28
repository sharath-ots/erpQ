import { Controller, useFormContext } from 'react-hook-form';
import { Box, Divider, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import * as yup from 'yup';
import IconifyIcon from 'components/base/IconifyIcon';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';

export const companyInfoSchema = yup.object().shape({
  companyInfo: yup.object({
    companyName: yup.string().required('Required'),
    industryType: yup.string().optional(),
    noOfEmployees: yup.string().optional(),
    annualRevenue: yup.number()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .nullable()
      .optional(),

    territory: yup.string().optional(),
    marketSegment: yup.string().optional(),
    contact: yup.object({
      city: yup.string().optional(),
      state: yup.string().optional(),
      country: yup.string().optional(),
    }),

    website: yup.string()
      .test(
        'is-url-valid',
        'Invalid URL',
        (value) => !value || yup.string().url().isValidSync(value)
      )
      .optional(),
  }),
});

const employeeOptions = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '501-1000', label: '501-1000' },
  { value: '1000+', label: '1000+' }
];

const marketSegmentOptions = [
  { value: 'B2C', label: 'B2C' },
  { value: 'B2B2B', label: 'B2B2B' },
  { value: 'B2G', label: 'B2G' },
  { value: 'B2B', label: 'B2B' }
];

const industryOptions = [
  { value: 'Tafel', label: 'Tafel' },
  { value: 'Gebäudedienste', label: 'Gebäudedienste' },
  { value: 'Gartenbau', label: 'Gartenbau' },
  { value: 'Fahrradhändler', label: 'Fahrradhändler' },
  { value: 'Privat', label: 'Privat' },
  { value: 'Tourismus', label: 'Tourismus' },
  { value: 'Gastro', label: 'Gastro' },
  { value: 'Metzgerei', label: 'Metzgerei' },
  { value: 'Ots', label: 'Ots' },
  { value: 'Keine', label: 'Keine' },
  { value: 'last mile', label: 'Last Mile' },
  { value: 'Foto', label: 'Foto' },
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'state', label: 'State' },
  { value: 'testa', label: 'Testa' },
  { value: 'Venture Capital', label: 'Venture Capital' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Television', label: 'Television' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Software', label: 'Software' },
  { value: 'Soap & Detergent', label: 'Soap & Detergent' },
  { value: 'Service', label: 'Service' },
  { value: 'Securities & Commodity Exchanges', label: 'Securities & Commodity Exchanges' },
  { value: 'Retail & Wholesale', label: 'Retail & Wholesale' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Publishing', label: 'Publishing' },
  { value: 'Private Equity', label: 'Private Equity' },
  { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
  { value: 'Pension Funds', label: 'Pension Funds' },
  { value: 'Online Auctions', label: 'Online Auctions' },
  { value: 'Newspaper Publishers', label: 'Newspaper Publishers' },
  { value: 'Music', label: 'Music' },
  { value: 'Motion Picture & Video', label: 'Motion Picture & Video' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Investment Banking', label: 'Investment Banking' },
  { value: 'Internet Publishing', label: 'Internet Publishing' },
  { value: 'Health Care', label: 'Health Care' },
  { value: 'Grocery', label: 'Grocery' },
  { value: 'Food, Beverage & Tobacco', label: 'Food, Beverage & Tobacco' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Executive Search', label: 'Executive Search' },
  { value: 'Entertainment & Leisure', label: 'Entertainment & Leisure' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Education', label: 'Education' },
  { value: 'Department Stores', label: 'Department Stores' },
  { value: 'Defense', label: 'Defense' },
  { value: 'Cosmetics', label: 'Cosmetics' },
  { value: 'Consumer Products', label: 'Consumer Products' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Computer', label: 'Computer' },
  { value: 'Chemical', label: 'Chemical' },
  { value: 'Brokerage', label: 'Brokerage' },
  { value: 'Broadcasting', label: 'Broadcasting' },
  { value: 'Biotechnology', label: 'Biotechnology' },
  { value: 'Banking', label: 'Banking' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Apparel & Accessories', label: 'Apparel & Accessories' },
  { value: 'Airline', label: 'Airline' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Aerospace', label: 'Aerospace' },
  { value: 'Advertising', label: 'Advertising' },
  { value: 'Accounting', label: 'Accounting' }
];

const CompanyInfoForm = ({ label }) => {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>

      <Stack direction="column" spacing={4}>
        <ContactFormSection title="Organization Details">
          <TextField fullWidth label="Organization Name" error={!!errors.companyInfo?.companyName} helperText={errors.companyInfo?.companyName?.message} {...register('companyInfo.companyName')} />

          <Grid container spacing={2} sx={{ width: 1, mt: 1 }}>
            <Grid size={6}>
              <ControlledSelect name="companyInfo.industryType" label="Industry" options={industryOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="companyInfo.noOfEmployees" label="No of Employees" options={employeeOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth type="number" label="Annual Revenue" {...register('companyInfo.annualRevenue')} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Website URL" {...register('companyInfo.website')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Market & Location">
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField fullWidth label="Territory" {...register('companyInfo.territory')} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="companyInfo.marketSegment" label="Market Segment" options={marketSegmentOptions} control={control} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="City" {...register('companyInfo.contact.city')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="State/Province" {...register('companyInfo.contact.state')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Country" {...register('companyInfo.contact.country')} />
            </Grid>
          </Grid>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default CompanyInfoForm;