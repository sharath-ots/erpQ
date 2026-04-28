import { Controller, useFormContext } from 'react-hook-form';
import { Box, Divider, FormHelperText, Grid, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import * as yup from 'yup';
import AvatarDropBox from 'components/base/AvatarDropBox';
import NumberTextField from 'components/base/NumberTextField';
import ContactFormSection from 'components/sections/crm/add-contact/ContactFormSection';
import ControlledSelect from 'components/sections/crm/add-contact/ControlledSelect';

export const personalInfoSchema = yup.object({
  personalInfo: yup.object({
    profileImage: yup.mixed().optional(),
    salutation: yup.string().optional(),
    firstName: yup.string().optional(),
    middleName: yup.string().optional(),
    lastName: yup.string().optional(),
    gender: yup.string().optional(),
    workEmail: yup.string().email('Invalid email').required('Required'),
    personalEmail: yup.string().email('Invalid email').optional(),
    phoneNumber: yup.string().optional(),
    whatsappNumber: yup.string().optional(),
    phoneExt: yup.string().optional(),
    jobTitle: yup.string().optional(),
    linkedInUrl: yup.string().url('Invalid URL').optional(),
  }),
});

const salutationOptions = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Dr', label: 'Dr' }
];

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

const PersonalInfoForm = ({ label }) => {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <div>
      <Box sx={{ mb: 4.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{label}</Typography>
        <Divider />
      </Box>
      <Stack direction="column" spacing={4}>
        <ContactFormSection title="Profile Picture">
          <Controller
            control={control}
            name="personalInfo.profileImage"
            render={({ field: { value, onChange } }) => {
              return (
                <AvatarDropBox
                  defaultFile={value}
                  onDrop={(acceptedFiles) => {
                    if (acceptedFiles.length > 0) {
                      onChange(acceptedFiles[0]);
                    }
                  }}
                  sx={{
                    '& img': {
                      objectFit: 'cover',
                    },
                  }}
                  error={errors.personalInfo?.profileImage ? 'Invalid avatar' : undefined}
                />
              );
            }}
          />
          {errors.personalInfo?.profileImage?.message && (
            <FormHelperText error>{errors.personalInfo?.profileImage?.message}</FormHelperText>
          )}
          <Typography variant="caption" color="text.secondary">
            JPG or PNG, Recommended size 1:1, Up to 10MB.
          </Typography>
        </ContactFormSection>
        <ContactFormSection title="Basic Information">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <ControlledSelect
                name="personalInfo.salutation"
                label="Salutation"
                options={salutationOptions}
                control={control}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="First Name" error={!!errors.personalInfo?.firstName} helperText={errors.personalInfo?.firstName?.message} {...register('personalInfo.firstName')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Middle Name" {...register('personalInfo.middleName')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Last Name" error={!!errors.personalInfo?.lastName} helperText={errors.personalInfo?.lastName?.message} {...register('personalInfo.lastName')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ControlledSelect name="personalInfo.gender" label="Gender" options={genderOptions} control={control} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Contact Details">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Primary Email" error={!!errors.personalInfo?.workEmail} helperText={errors.personalInfo?.workEmail?.message} {...register('personalInfo.workEmail')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Alternate Email 1" {...register('personalInfo.personalEmail')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberTextField fullWidth label="Phone Number" error={!!errors.personalInfo?.phoneNumber} helperText={errors.personalInfo?.phoneNumber?.message} {...register('personalInfo.phoneNumber')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberTextField fullWidth label="WhatsApp Number" {...register('personalInfo.whatsappNumber')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberTextField fullWidth label="Phone Ext." {...register('personalInfo.phoneExt')} />
            </Grid>
          </Grid>
        </ContactFormSection>

        <ContactFormSection title="Professional Details">
          <Grid container spacing={2} sx={{ width: 1 }}>
            <Grid size={6}>
              <TextField fullWidth label="Job Title" {...register('personalInfo.jobTitle')} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="LinkedIn URL" {...register('personalInfo.linkedInUrl')} />
            </Grid>
          </Grid>
        </ContactFormSection>
      </Stack>
    </div>
  );
};

export default PersonalInfoForm;