'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Button, Container, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import OrganizationInfoForm, { orgInfoSchema } from './steps/OrganizationInfoForm';
import OpportunityDetailsForm, { oppDetailsSchema } from './steps/OpportunityDetailsForm';
import BasicContactInfoForm, { contactInfoSchema } from './steps/BasicContactInfoForm';

const steps = [
  {
    id: 1,
    label: (
      <Typography variant="subtitle2" fontWeight={700}>
        Contact Info
      </Typography>
    ),
    content: <BasicContactInfoForm label="Basic & Contact Information" />,
  },
  {
    id: 2,
    label: (
      <Typography variant="subtitle2" fontWeight={700}>
        Organization Info
      </Typography>
    ),
    content: <OrganizationInfoForm label="Organization Information" />,
  },
  {
    id: 3,
    label: (
      <Typography variant="subtitle2" fontWeight={700}>
        Opportunity Details
      </Typography>
    ),
    content: <OpportunityDetailsForm label="Opportunity Details" />,
  },
];

const validationSchemas = [contactInfoSchema, orgInfoSchema, oppDetailsSchema];

const AddOpportunityStepper = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({});
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const methods = useForm({
    resolver: yupResolver(validationSchemas[activeStep]),
    defaultValues: {
      contactInfo: {},
      orgInfo: {},
      oppDetails: {
        status: 'Open',
        probability: 100,
        namingSeries: 'CRM-OPP-.YYYY.-'
      },
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

  const handleBack = () => setActiveStep((prevStep) => prevStep - 1);

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    // Helper function to safely send null instead of empty strings to ERPNext
    const cleanVal = (val) => (val === "" || val === undefined ? null : val);

    const erpPayload = {
      // Step 1: Contact
      opportunity_from: cleanVal(data.contactInfo?.opportunityFrom),
      party_name: cleanVal(data.contactInfo?.partyName),
      contact_person: cleanVal(data.contactInfo?.contactPerson),
      job_title: cleanVal(data.contactInfo?.jobTitle),
      contact_email: cleanVal(data.contactInfo?.contactEmail),
      contact_mobile: cleanVal(data.contactInfo?.contactMobile),
      phone: cleanVal(data.contactInfo?.phone),
      whatsapp: cleanVal(data.contactInfo?.whatsapp),
      phone_ext: cleanVal(data.contactInfo?.phoneExt),

      // Step 2: Organization
      // 🚀 CRITICAL: Make sure the typed Company exactly matches ERPNext (e.g., "CityQ")
      company: cleanVal(data.orgInfo?.company) || "CityQ", 
      customer_group: cleanVal(data.orgInfo?.customerGroup),
      territory: cleanVal(data.orgInfo?.territory),
      industry: cleanVal(data.orgInfo?.industry),
      market_segment: cleanVal(data.orgInfo?.marketSegment),
      no_of_employees: cleanVal(data.orgInfo?.noOfEmployees),
      annual_revenue: Number(data.orgInfo?.annualRevenue) || 0,
      website: cleanVal(data.orgInfo?.website),
      city: cleanVal(data.orgInfo?.city),
      state: cleanVal(data.orgInfo?.state),
      country: cleanVal(data.orgInfo?.country),

      // Step 3: Opportunity Details
      naming_series: cleanVal(data.oppDetails?.namingSeries) || 'CRM-OPP-.YYYY.-',
      
      // 🚀 CRITICAL: Fix Date Formatting for ERPNext (Strip time/timezone)
      transaction_date: data.oppDetails?.transactionDate ? data.oppDetails.transactionDate.split('T')[0] : null,
      expected_closing: data.oppDetails?.expectedClosing ? data.oppDetails.expectedClosing.split('T')[0] : null,
      
      opportunity_type: cleanVal(data.oppDetails?.opportunityType),
      status: cleanVal(data.oppDetails?.status) || 'Open',
      sales_stage: cleanVal(data.oppDetails?.salesStage),
      probability: Number(data.oppDetails?.probability) || 0,
      currency: cleanVal(data.oppDetails?.currency),
      opportunity_amount: Number(data.oppDetails?.opportunityAmount) || 0,
      conversion_rate: Number(data.oppDetails?.conversionRate) || 1,
      source: cleanVal(data.oppDetails?.source),
      campaign: cleanVal(data.oppDetails?.campaign),
      opportunity_owner: cleanVal(data.oppDetails?.opportunityOwner),
      language: cleanVal(data.oppDetails?.language),
    };

    try {
      const response = await fetch('/api/opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(erpPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to save opportunity in ERPNext';
        
        // Extract specific Python exception from Frappe if available
        if (result.exc_type) {
            errorMessage = `ERP Error (${result.exc_type}): Please verify that text entered in Link fields (like Company or Contact Person) exactly match existing records.`;
        } else if (result._server_messages) {
          try {
            const messages = JSON.parse(result._server_messages);
            const parsedMsg = JSON.parse(messages[0]);
            errorMessage = parsedMsg.message || errorMessage;
          } catch (e) {
            errorMessage = "Validation Error. Check console for details.";
          }
        }
        throw new Error(errorMessage);
      }

      enqueueSnackbar('Opportunity added successfully!', { variant: 'success' });
      reset();
      router.push('/m/crmq/opportunity-list'); 
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
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
              <StepLabel onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleFormSubmit}>
          <Box sx={{ mb: 7 }}>{steps[activeStep]?.content}</Box>
          <Stack gap={2} justifyContent="flex-end" direction="row">
            {activeStep > 0 && (
              <Button variant="soft" color="neutral" onClick={handleBack} sx={{ px: 4 }}>
                Back
              </Button>
            )}
            <Button type="submit" variant="soft" sx={{ px: 4 }} disabled={isSubmitting}>
              {activeStep === steps.length - 1 ? 'Save Opportunity' : 'Save & Continue'}
            </Button>
          </Stack>
        </Box>
      </Container>
    </FormProvider>
  );
};

export default AddOpportunityStepper;