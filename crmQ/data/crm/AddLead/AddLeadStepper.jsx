'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Button, Container, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import CompanyInfoForm, {
  companyInfoSchema,
} from '../AddLead/steps/CompanyInfoForm';
import LeadInfoForm, {
  leadInfoSchema,
} from '../AddLead/steps/LeadInfoForm';
import PersonalInfoForm, {
  personalInfoSchema,
} from '../AddLead/steps/PersonalInfoForm';

const steps = [
  {
    id: 1,
    label: (
      <Typography variant="subtitle2" fontWeight={700}>
        Personal Info
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          rmation
        </Box>
      </Typography>
    ),
    content: <PersonalInfoForm label="Personal Information" />,
  },
  {
    id: 2,
    label: (
      <Typography
        variant="subtitle2"
        fontWeight={700}
        sx={{
          '& br': { display: { xs: 'none', sm: 'inline' } },
        }}
      >
        Company Info
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          rmation
        </Box>
      </Typography>
    ),
    content: <CompanyInfoForm label="Company Information" />,
  },
  {
    id: 3,
    label: (
      <Typography
        variant="subtitle2"
        fontWeight={700}
        sx={{
          '& br': { display: { xs: 'none', sm: 'inline' } },
        }}
      >
        Lead Info
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          rmation
        </Box>
      </Typography>
    ),
    content: <LeadInfoForm label="Lead Information" />,
  },
];

const validationSchemas = [personalInfoSchema, companyInfoSchema, leadInfoSchema];

const AddLeadStepper = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({});
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const methods = useForm({
    resolver: yupResolver(validationSchemas[activeStep]),
    defaultValues: {
      personalInfo: {},
      companyInfo: {},
      leadInfo: {},
    },
  });

  const { handleSubmit, reset } = methods;

  const handleNext = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      setCompletedSteps((prev) => ({ ...prev, [activeStep]: true }));
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const erpPayload = {
      salutation: data.personalInfo?.salutation,
      first_name: data.personalInfo?.firstName,
      middle_name: data.personalInfo?.middleName,
      last_name: data.personalInfo?.lastName,
      gender: data.personalInfo?.gender,
      email_id: data.personalInfo?.workEmail,
      mobile_no: data.personalInfo?.phoneNumber,
      whatsapp_no: data.personalInfo?.whatsappNumber,
      phone_ext: data.personalInfo?.phoneExt,
      job_title: data.personalInfo?.jobTitle,

      company_name: data.companyInfo?.companyName,
      industry: data.companyInfo?.industryType,
      no_of_employees: data.companyInfo?.noOfEmployees,
      annual_revenue: data.companyInfo?.annualRevenue,
      territory: data.companyInfo?.territory,
      market_segment: data.companyInfo?.marketSegment,
      city: data.companyInfo?.contact?.city,
      state: data.companyInfo?.contact?.state,
      country: data.companyInfo?.contact?.country,
      website: data.companyInfo?.website,

      request_type: data.leadInfo?.requestType,
      type: data.leadInfo?.leadType,
      source: data.leadInfo?.source,
      status: data.leadInfo?.status,
      lead_stage: data.leadInfo?.leadStage,
      potential_volume: data.leadInfo?.potentialVolume,
      conversion_potential: data.leadInfo?.conversionPotential,
      urgency: data.leadInfo?.urgency,
      service_location: data.leadInfo?.serviceLocation,
      qualified_by: data.leadInfo?.qualifiedBy,
      qualified_on: data.leadInfo?.qualifiedOn,
      campaign_name: data.leadInfo?.campaignName,
      disabled: data.leadInfo?.disabled ? 1 : 0,
      blog_subscriber: data.leadInfo?.blogSubscriber ? 1 : 0,
    };

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(erpPayload)
      });

      // 🚀 EXPERT FIX: Parse the error before throwing!
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Raw ERPNext Error:", errorData);

        let errorMessage = 'Failed to save lead in ERPNext';

        // Frappe/ERPNext hides its specific validation messages inside _server_messages
        if (errorData._server_messages) {
          try {
            const messages = JSON.parse(errorData._server_messages);
            const parsedMsg = JSON.parse(messages[0]);
            errorMessage = parsedMsg.message || errorMessage;
          } catch (e) {
            errorMessage = "Validation Error. Check console for details.";
          }
        } else if (errorData.exc_type) {
          errorMessage = `ERP Error: ${errorData.exc_type}`;
        }

        // Throw the ACTUAL error message we extracted
        throw new Error(errorMessage);
      }

      // Success actions
      enqueueSnackbar('Lead added successfully to ERPNext!', { variant: 'success' });
      reset();
      router.push('/m/crmq/list/Lead');

    } catch (error) {
      console.error("Save Error:", error);
      // 🚀 Show the real error to the user in the red popup
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (activeStep === steps.length - 1) {
      handleSubmit(onSubmit)();
    } else {
      handleNext();
    }
  };

  return (
    <FormProvider {...methods}>
      <Container maxWidth="sm" sx={{ p: 0 }}>
        <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map(({ id, label }, index) => (
            <Step key={id} completed={!!completedSteps[index]} sx={{ p: 0 }}>
              <StepLabel onClick={() => handleStepClick(index)} sx={{ cursor: 'pointer' }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleFormSubmit}>
          <Box sx={{ mb: 7 }}>{steps[activeStep]?.content}</Box>

          <Stack gap={2} justifyContent="flex-end">
            {activeStep > 0 && (
              <Button variant="soft" color="neutral" onClick={handleBack} sx={{ px: 4 }}>
                Back
              </Button>
            )}

            {activeStep === steps.length - 1 ? (
              <Button type="submit" variant="soft" sx={{ px: 4 }}>
                Save
              </Button>
            ) : (
              <Button type="submit" variant="soft">
                Save & Continue
              </Button>
            )}
          </Stack>
        </Box>
      </Container>
    </FormProvider>
  );
};

export default AddLeadStepper;
