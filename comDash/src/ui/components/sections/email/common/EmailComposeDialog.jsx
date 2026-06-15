'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useSnackbar } from 'notistack';
import {
  Autocomplete,
  Dialog,
  dialogClasses,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Button,
  CircularProgress // 🚀 Added
} from '@mui/material';
import * as yup from 'yup';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailComposeEditor from './EmailComposeEditor';

// --- ERP Data Fetching Schema ---
const emailComposeSchema = yup.object().shape({
  sender: yup.string().required('Sender is required'),
  to: yup.string().required('This field is required!'),
  cc: yup.array().of(yup.string()).optional(),
  bcc: yup.array().of(yup.string()).optional(),
  subject: yup.string().optional(),
  body: yup.string().optional(),
  schedule_send: yup.string().optional(),
  add_signature: yup.boolean().default(true),
  send_me_a_copy: yup.boolean().default(false),
  send_read_receipt: yup.boolean().default(false),
});

const FROM_OPTIONS = ['salesq@cityq.biz', 'media@cityq.biz'];

const EmailComposeDialog = ({ open, handleClose, initialData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);

  const [leadEmailOptions, setLeadEmailOptions] = useState([]);
  const [allEmailOptions, setAllEmailOptions] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState('');

  // 🚀 AI State Variables
  const [aiInstruction, setAiInstruction] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(emailComposeSchema),
    defaultValues: {
      sender: FROM_OPTIONS[0],
      add_signature: true,
      to: '',
      cc: [],
      bcc: [],
      body: ''
    }
  });

  const { enqueueSnackbar } = useSnackbar();

  // Fetch ERP Templates, Users, and Leads
  useEffect(() => {
    const fetchERPData = async () => {
      try {
        const templateRes = await fetch('/api/email-template/email-templates');
        if (templateRes.ok) {
          const templates = await templateRes.json();
          setEmailTemplates(templates || []);
        }

        let userEmails = [];
        const userRes = await fetch('/api/users/system-users');
        if (userRes.ok) {
          const users = await userRes.json();
          userEmails = users.map(u => u.name).filter(Boolean);
        }

        let leadEmails = [];
        const leadRes = await fetch('/api/lead');
        if (leadRes.ok) {
          const leads = await leadRes.json();
          leadEmails = leads.map(l => l.email_id).filter(Boolean);
        }

        setLeadEmailOptions([...new Set(leadEmails)]);
        setAllEmailOptions([...new Set([...userEmails, ...leadEmails])]);

      } catch (err) {
        console.error("ERP Data fetch failed", err);
      }
    };
    if (open) fetchERPData();
  }, [open]);

  // Handle Initial Data
  useEffect(() => {
    if (open) {
      reset({
        ...initialData,
        sender: initialData?.sender || FROM_OPTIONS[0],
        add_signature: true,
        to: initialData?.to || '',
        subject: initialData?.subject || '',
        body: initialData?.body || ''
      });
      setSelectedTemplate(''); 
      setAiInstruction(''); // Clear AI box on open
    }
  }, [open, initialData, reset]);

  const handleAddTemplate = () => {
    const template = emailTemplates.find(t => t.name === selectedTemplate);
    if (template) {
      const currentSubject = watch('subject') || '';
      const currentBody = watch('body') || '';

      setValue('subject', template.subject ? template.subject : currentSubject);
      const newBody = currentBody ? `${currentBody}<br><br>${template.response_html}` : template.response_html;
      setValue('body', newBody);
    }
  };

  const handleClearAndAddTemplate = () => {
    const template = emailTemplates.find(t => t.name === selectedTemplate);
    if (template) {
      setValue('subject', template.subject || '');
      setValue('body', template.response_html || '');
    }
  };

  // 🚀 EXPERT FIX: Streaming AI Draft logic injected straight into the editor
  const handleGenerateDraft = async () => {
    if (!aiInstruction.trim()) {
      enqueueSnackbar('Please provide instructions for the AI.', { variant: 'warning' });
      return;
    }
    
    setIsDrafting(true);
    const originalBody = watch('body') || ''; 
    let currentDraft = ''; 

    try {
      const targetRecipient = watch('to') || 'Customer';
      const senderEmail = watch('sender') || 'CityQ Representative';

      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailThread: '', // Blank because it is a new email
          instructions: aiInstruction,
          senderEmail: senderEmail,
          recipientEmail: targetRecipient
        })
      });

      if (!res.ok) throw new Error('Failed to reach AI API');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const json = JSON.parse(line);
            if (json.response) {
              currentDraft += json.response;
              const formattedDraft = currentDraft.replace(/\n/g, '<br>');
              
              // Streams the typing effect directly into the React Hook Form state
              setValue('body', `${originalBody ? originalBody + '<br><br>' : ''}${formattedDraft}`);
            }
          } catch (e) {
            console.debug('Streaming chunk parsing skip');
          }
        }
      }
      
      setAiInstruction(''); 
      enqueueSnackbar('AI Draft applied successfully!', { variant: 'success' });
      
    } catch (error) {
      console.error('Draft Error:', error);
      setValue('body', originalBody); 
      enqueueSnackbar('Failed to generate AI draft', { variant: 'error' });
    } finally {
      setIsDrafting(false);
    }
  };

  const submitHandler = async (data) => {
    const extractEmail = (str) => {
      if (!str) return '';
      const match = str.match(/<(.+)>/);
      return match ? match[1].trim() : str.trim();
    };

    const payload = {
      lead_id: initialData?.leadId || '', 
      from: data.sender,
      recipients: extractEmail(data.to),
      cc: data.cc ? data.cc.map(extractEmail).join(',') : '',
      bcc: data.bcc ? data.bcc.map(extractEmail).join(',') : '',
      subject: data.subject,
      content: data.body,
      send_me_a_copy: data.send_me_a_copy ? 1 : 0,
      read_receipt: data.send_read_receipt ? 1 : 0,
      schedule_at: data.schedule_send || null
    };

    try {
      const res = await fetch('/api/lead/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        enqueueSnackbar('Email sent successfully!', { variant: 'success' });
        handleClose();
        reset();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Send Error:", error);
      enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    }
  };

  return (
    <Dialog
      hideBackdrop={!isExpanded}
      disableEnforceFocus
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: handleSubmit(submitHandler),
          sx: (theme) => ({
            position: isExpanded ? 'absolute' : 'sticky',
            bottom: isExpanded ? 'unset' : theme.mixins.footer?.sm ? theme.mixins.footer.sm + 32 : 32,
            borderRadius: 6,
            pointerEvents: 'auto',
            margin: { xs: 2, sm: 4 },
            mx: isExpanded ? 'auto !important' : undefined,
            maxWidth: isExpanded ? 800 : 746,
            width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
            boxShadow: theme.vars?.shadows?.[5] || theme.shadows[5],
            height: 'max-content',
            ...theme.applyStyles?.('light', { outline: 0 }),
          }),
        },
      }}
      sx={{
        pointerEvents: isExpanded ? 'auto' : 'none',
        overflow: 'scroll',
        [`& .${dialogClasses.container}`]: {
          justifyContent: isExpanded ? 'center' : 'flex-end',
          alignItems: isExpanded ? 'center' : 'flex-end',
        },
      }}
      open={open}
    >
      <DialogContent sx={{ p: 3 }}>

        <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 400, flexGrow: 1 }}>
            {initialData?.subject ? 'Reply' : 'New message'}
          </Typography>
          <IconButton size="small" sx={{ p: 1 }} onClick={() => setIsExpanded(!isExpanded)}>
            <IconifyIcon
              icon={isExpanded ? 'material-symbols:close-fullscreen-rounded' : 'material-symbols:open-in-full-rounded'}
              sx={{ fontSize: 20, color: 'text.primary' }}
            />
          </IconButton>
          <IconButton size="small" sx={{ p: 1 }} onClick={handleClose}>
            <IconifyIcon icon="material-symbols:close-rounded" sx={{ fontSize: 20, color: 'text.primary' }} />
          </IconButton>
        </Stack>

        <Stack direction="column" spacing={2.5} sx={{ mb: 3, width: '100%' }}>

          <TextField
            select
            fullWidth
            label="From"
            {...register('sender')}
            SelectProps={{ MenuProps: { sx: { zIndex: 10000 } } }}
          >
            {FROM_OPTIONS.map(mail => <MenuItem key={mail} value={mail}>{mail}</MenuItem>)}
          </TextField>

          <Controller
            name="to"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <Autocomplete
                {...field}
                fullWidth
                freeSolo
                openOnFocus
                options={leadEmailOptions}
                onChange={(_, val) => field.onChange(val || '')}
                onInputChange={(_, val) => field.onChange(val)}
                value={field.value || ''}
                slotProps={{ popper: { sx: { zIndex: 10000 } } }}
                renderInput={(params) => <TextField {...params} fullWidth error={!!errors.to} label="To (Leads)" />}
              />
            )}
          />

          <Controller
            name="cc"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <Autocomplete
                {...field}
                fullWidth
                multiple
                freeSolo
                openOnFocus
                options={allEmailOptions}
                onChange={(_, val) => field.onChange(val || [])}
                value={field.value || []}
                slotProps={{ popper: { sx: { zIndex: 10000 } } }}
                renderInput={(params) => <TextField {...params} fullWidth error={!!errors.cc} label="CC (All Contacts)" />}
              />
            )}
          />

          <Controller
            name="bcc"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <Autocomplete
                {...field}
                fullWidth
                multiple
                freeSolo
                openOnFocus
                options={allEmailOptions}
                onChange={(_, val) => field.onChange(val || [])}
                value={field.value || []}
                slotProps={{ popper: { sx: { zIndex: 10000 } } }}
                renderInput={(params) => <TextField {...params} fullWidth error={!!errors.bcc} label="BCC (All Contacts)" />}
              />
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              select
              fullWidth
              label="Email Template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              SelectProps={{ MenuProps: { sx: { zIndex: 10000 } } }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {emailTemplates.map(t => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
            </TextField>

            <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
              <Button
                variant="outlined"
                color="inherit"
                disabled={!selectedTemplate}
                onClick={handleAddTemplate}
                sx={{ height: 56, borderRadius: 2 }}
              >
                Add
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!selectedTemplate}
                onClick={handleClearAndAddTemplate}
                sx={{ height: 56, borderRadius: 2, boxShadow: 'none' }}
              >
                Clear & Add
              </Button>
            </Stack>
          </Stack>

          <TextField fullWidth label="Subject" {...register('subject')} InputLabelProps={{ shrink: watch('subject') ? true : false }} />

          {/* 🚀 AI Instruction Block */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Tell AI what to write (e.g., 'Introduce our new e-bike models')..."
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              disabled={isDrafting}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <Button
              type="button" 
              // 🚀 Disabled if no instructions are provided
              disabled={isDrafting || !aiInstruction.trim()}
              onClick={(e) => {
                e.preventDefault(); 
                e.stopPropagation();
                handleGenerateDraft(); 
              }}
              sx={{
                height: '56px',
                bgcolor: '#EAF3FD',
                color: '#3385F0',
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#DBE6EB' },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled'
                }
              }}
              startIcon={isDrafting ? <CircularProgress size={16} /> : <IconifyIcon icon="material-symbols:auto-awesome" />}
            >
              {isDrafting ? 'Drafting...' : 'AI Draft'}
            </Button>
          </Stack>

          <TextField fullWidth type="datetime-local" label="Schedule Send" InputLabelProps={{ shrink: true }} {...register('schedule_send')} />

          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', pt: 1 }}>
            <FormControlLabel control={<Checkbox size="small" {...register('add_signature')} />} label={<Typography variant="body2" color="text.secondary">Add Signature</Typography>} />
            <FormControlLabel control={<Checkbox size="small" {...register('send_me_a_copy')} />} label={<Typography variant="body2" color="text.secondary">Send Copy</Typography>} />
            <FormControlLabel control={<Checkbox size="small" {...register('send_read_receipt')} />} label={<Typography variant="body2" color="text.secondary">Read Receipt</Typography>} />
          </Stack>
        </Stack>

        <Box sx={{ width: '100%' }}>
          <Controller
            name="body"
            control={control}
            render={({ field }) => (
              <EmailComposeEditor onChange={field.onChange} content={field.value} isValid={!errors.body} />
            )}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposeDialog;