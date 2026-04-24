import { Controller, useFormContext } from 'react-hook-form';
import { Box, Divider, Stack, TextField, Typography, Grid, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import * as yup from 'yup';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';

export const leadInfoSchema = yup.object().shape({
  leadInfo: yup.object({
    requestType: yup.string().optional(),
    leadType: yup.string().optional(),
    source: yup.string().optional(),
    status: yup.string().optional(),
    leadStage: yup.string().optional(),
    potentialVolume: yup.string().optional(),
    conversionPotential: yup.string().optional(),
    urgency: yup.string().optional(),
    serviceLocation: yup.string().optional(),
    qualifiedBy: yup.string().optional(),
    qualifiedOn: yup.string().optional(),
    campaignName: yup.string().optional(),
    language: yup.string().optional(),
    message: yup.string().optional(),
    disabled: yup.boolean().optional(),
    emailConsent: yup.boolean().optional(),
    blogSubscriber: yup.boolean().optional(),
  }),
});

// Dropdown Options based on ERPNext
const requestOptions = [
  { value: 'Product Availability & Delivery Time', label: 'Product Availability' },
  { value: 'Quotation Request', label: 'Quotation Request' },
  { value: 'Technical Information', label: 'Technical Information' },
  { value: 'Service Request', label: 'Service Request' },
  { value: 'Maintenance Support', label: 'Maintenance Support' },
  { value: 'Legal Enquiry', label: 'Legal Enquiry' },
  { value: 'Compliance / Documentation', label: 'Compliance / Documentation' },
  { value: 'Media Enquiry', label: 'Media Enquiry' },
  { value: 'References & Case Studies', label: 'References & Case Studies' },
  { value: 'Press / News', label: 'Press / News' }
];

const typeOptions = [
  { value: 'e-commerce & parcel', label: 'E-commerce & Parcel' },
  { value: 'food & grocery delivery', label: 'Food & Grocery Delivery' },
  { value: 'delivery services', label: 'Delivery Services' },
  { value: 'companies', label: 'Companies' },
  { value: 'Resellers', label: 'Resellers' },
  { value: 'inner-logistics', label: 'Inner-Logistics' },
  { value: 'tourism', label: 'Tourism' },
  { value: 'hotels & event areas', label: 'Hotels & Event Areas' },
  { value: 'people transport', label: 'People Transport' },
  { value: 'urban sharing platforms', label: 'Urban Sharing Platforms' },
  { value: 'rental', label: 'Rental' },
  { value: 'job-bike for companies', label: 'Job-Bike for Companies' },
  { value: 'Reha device', label: 'Reha Device' },
  { value: 'urban logistics', label: 'Urban Logistics' },
  { value: 'public transport', label: 'Public Transport' },
  { value: 'municipal fleets', label: 'Municipal Fleets' },
  { value: 'elderly homes', label: 'Elderly Homes' },
  { value: 'seniors & assisted people', label: 'Seniors & Assisted People' },
  { value: 'commuter & family', label: 'Commuter & Family' },
  { value: 'younster', label: 'Youngster' },
  { value: 'assocciations', label: 'Associations' },
  { value: 'disability riders', label: 'Disability Riders' },
  { value: 'investors', label: 'Investors' },
  { value: 'media', label: 'Media' },
  { value: 'service & maintenance', label: 'Service & Maintenance' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'others', label: 'Others' }
];

// 🚀 EXPERT FIX: Added the new Lead Source options array
const sourceOptions = [
  { value: 'startup Stuttgart', label: 'Startup Stuttgart' },
  { value: 'intergastra-Stuttgart-02-2026', label: 'Intergastra-Stuttgart-02-2026' },
  { value: 'Website', label: 'Website' },
  { value: 'Walk In', label: 'Walk In' },
  { value: 'Campaign', label: 'Campaign' },
  { value: "Customer's Vendor", label: "Customer's Vendor" },
  { value: 'Mass Mailing', label: 'Mass Mailing' },
  { value: 'Supplier Reference', label: 'Supplier Reference' },
  { value: 'Exhibition', label: 'Exhibition' },
  { value: 'Cold Calling', label: 'Cold Calling' },
  { value: 'Advertisement', label: 'Advertisement' },
  { value: 'Reference', label: 'Reference' },
  { value: 'Existing Customer', label: 'Existing Customer' }
];

const statusOptions = [
  { value: 'New', label: 'New' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Open', label: 'Open' },
  { value: 'Replied', label: 'Replied' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Hold', label: 'Hold' },
  { value: 'Quotation', label: 'Quotation' },
  { value: 'Lost Quotation', label: 'Lost Quotation' },
  { value: 'Interested', label: 'Interested' },
  { value: 'Converted', label: 'Converted' },
  { value: 'Do Not Contact', label: 'Do Not Contact' },
  { value: 'Completed', label: 'Completed' }
];

const stageOptions = [
  { value: 'Welcome', label: 'Welcome' }, { value: 'Data Gathering', label: 'Data Gathering' },
  { value: 'Requirements and Clarifications', label: 'Requirements' }, { value: 'Demo', label: 'Demo' }
];

const volumeOptions = [
  { value: '1 vehicle', label: '1 vehicle' }, { value: '2-5 vehicle', label: '2-5 vehicle' },
  { value: '6-10 vehicle', label: '6-10 vehicle' }, { value: '25+ vehicle', label: '25+ vehicle' }
];

const urgencyOptions = [
  { value: 'Immediate', label: 'Immediate' }, { value: 'In 1 month', label: 'In 1 month' },
  { value: 'In 3 months', label: 'In 3 months' }, { value: 'In 6 months', label: 'In 6 months' },
  { value: 'In 1 year', label: 'In 1 year' }
];

const conversionOptions = [
  { value: '0 - 25 %', label: '0 - 25 %' }, { value: '26 - 50%', label: '26 - 50%' },
  { value: '51 - 75%', label: '51 - 75%' }, { value: '76 - 100%', label: '76 - 100%' }
];

const LeadInfoForm = ({ label }) => {
  const { control, register, formState: { errors } } = useFormContext();

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>

      <Stack direction="column" spacing={4}>
        <ContactFormSection title="Lead Classification">
          <Grid container spacing={4} sx={{ width: 1, mt: 1 }} alignItems="flex-start">
            <Grid size={6}>
              <ControlledSelect name="leadInfo.requestType" label="Request Type" options={requestOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.leadType" label="Lead Type" options={typeOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.source" label="Source" options={sourceOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Campaign Name" {...register('leadInfo.campaignName')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Qualification & Status">
          <Grid container spacing={4} sx={{ width: 1, mt: 1 }} alignItems="flex-start">
            <Grid size={6}>
              <ControlledSelect name="leadInfo.status" label="Status" options={statusOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.leadStage" label="Lead Stage" options={stageOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.potentialVolume" label="Potential Volume" options={volumeOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.conversionPotential" label="Conversion Potential" options={conversionOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <ControlledSelect name="leadInfo.urgency" label="Urgency" options={urgencyOptions} control={control} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Service Location" {...register('leadInfo.serviceLocation')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Processing Details">
          <Grid container spacing={2} sx={{ width: 1, mt: 1 }} alignItems="flex-start">
            <Grid size={6}>
              <TextField fullWidth label="Qualified By" {...register('leadInfo.qualifiedBy')} />
            </Grid>
            <Grid size={6}>
              <Controller name="leadInfo.qualifiedOn" control={control} render={({ field }) => (
                <DatePicker label="Qualified On" sx={{ width: 1 }} value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date ? date.toISOString() : null)} />
              )} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Message from Lead" multiline rows={3} {...register('leadInfo.message')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Consents & Settings">
          <Stack direction="row" spacing={3}>
            <FormControlLabel control={<Checkbox {...register('leadInfo.emailConsent')} />} label="Email Consent" />
            <FormControlLabel control={<Checkbox {...register('leadInfo.blogSubscriber')} />} label="Blog Subscriber" />
            <FormControlLabel control={<Checkbox {...register('leadInfo.disabled')} />} label="Disabled" />
          </Stack>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default LeadInfoForm;