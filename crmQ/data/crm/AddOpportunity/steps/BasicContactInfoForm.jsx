import { useState, useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Divider, Grid, Stack, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';
import * as yup from 'yup';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';

export const contactInfoSchema = yup.object({
  contactInfo: yup.object({
    opportunityFrom: yup.string().required('Required'),
    partyName: yup.string().required('Required'),
    contactPerson: yup.string().optional(),
    jobTitle: yup.string().optional(),
    contactEmail: yup.string().email('Invalid email').optional(),
    contactMobile: yup.string().optional(),
    phone: yup.string().optional(),
    whatsapp: yup.string().optional(),
    phoneExt: yup.string().optional(),
  }),
});

const opportunityFromOptions = [
  { value: 'Customer', label: 'Customer' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Prospect', label: 'Prospect' }
];

const BasicContactInfoForm = ({ label }) => {
  const { register, control, formState: { errors }, setValue } = useFormContext();
  
  // 1. Watch the Opportunity From field
  const opportunityFrom = useWatch({ control, name: 'contactInfo.opportunityFrom' });
  
  const [partyOptions, setPartyOptions] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPartyList = async () => {
      if (!opportunityFrom) {
        setPartyOptions([]);
        return;
      }

      setLoadingParties(true);
      
      try {
        const endpoint = `/api/crm/get-party?type=${opportunityFrom}`; 
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Failed to fetch ${opportunityFrom}s`);
        
        const data = await response.json();
        
        if (isMounted) {
          const formattedOptions = data.map(item => {
            const displayName = item.lead_name || item.customer_name || item.company_name || '';
            return {
              id: item.name,
              label: `${item.name} ${displayName ? `- ${displayName}` : ''}`
            };
          });
          setPartyOptions(formattedOptions);
        }
      } catch (error) {
        console.error("Error fetching party list:", error);
        if (isMounted) setPartyOptions([]);
      } finally {
        if (isMounted) setLoadingParties(false);
      }
    };

    fetchPartyList();
    setValue('contactInfo.partyName', '');

    return () => { isMounted = false; };
  }, [opportunityFrom, setValue]);

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>
      
      <Stack direction="column" spacing={4}>
        <ContactFormSection title="Target Party">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ControlledSelect 
                name="contactInfo.opportunityFrom" 
                label="Opportunity From *" 
                options={opportunityFromOptions} 
                control={control} 
                error={errors.contactInfo?.opportunityFrom?.message} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="contactInfo.partyName"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={partyOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                    isOptionEqualToValue={(option, value) => option.id === value || option.id === value?.id}
                    onChange={(_, newValue) => field.onChange(newValue ? newValue.id : '')}
                    value={partyOptions.find(opt => opt.id === field.value) || null}
                    loading={loadingParties}
                    disabled={!opportunityFrom}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Party Name *"
                        error={!!errors.contactInfo?.partyName}
                        helperText={errors.contactInfo?.partyName?.message || (!opportunityFrom ? "Select 'Opportunity From' first" : "")}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingParties ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Primary Contact Person">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Person" {...register('contactInfo.contactPerson')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Job Title" {...register('contactInfo.jobTitle')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Email" error={!!errors.contactInfo?.contactEmail} helperText={errors.contactInfo?.contactEmail?.message} {...register('contactInfo.contactEmail')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Mobile" {...register('contactInfo.contactMobile')} />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Phone" {...register('contactInfo.phone')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="WhatsApp" {...register('contactInfo.whatsapp')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Phone Ext." {...register('contactInfo.phoneExt')} />
            </Grid>
          </Grid>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default BasicContactInfoForm;