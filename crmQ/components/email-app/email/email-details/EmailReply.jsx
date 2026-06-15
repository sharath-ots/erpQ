'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Button, MenuItem, Stack, TextField, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import IconifyIcon from 'components/base/IconifyIcon';
import SendOptionInput from './SendOptionInput';
import EmailComposeEditor from '../common/EmailComposeEditor';

const EmailReply = ({ email }) => {
  const [sendType, setSendType] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [aiInstruction, setAiInstruction] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();

  const extractEmail = (str) => {
    if (!str) return '';
    const match = str.match(/<(.+)>/);
    return match ? match[1].trim() : str.trim();
  };

  const rawToAddress = email?.to ? email.to.split(',')[0] : '';
  const FROM_EMAIL = extractEmail(rawToAddress) || 'salesq@cityq.biz';

  // 🚀 FIX 1: Removed isDrafting. Only reset the form if the user clicks a DIFFERENT email ID.
  useEffect(() => {
    setSendType('');
    setSelectedTemplate('');
    setRecipients([]);
    setSubject('');
    setAiInstruction(''); 
  }, [email?.id]); 

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (emailTemplates.length === 0) {
          const res = await fetch('/api/email-template/email-templates');
          if (res.ok) {
            const data = await res.json();
            setEmailTemplates(data || []);
          }
        }
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    };
    fetchTemplates();
  }, [emailTemplates.length]);

  // 🚀 FIX 2: Watch email?.id instead of email. 
  // If we watch the whole object, background updates will wipe out the AI's drafted text!
  useEffect(() => {
    if (sendType && email) {
      const originalMessage = email.details || email.content || '';
      const formattedDate = new Date(email.time).toLocaleString();

      let baseSubject = email.subject || '';
      baseSubject = baseSubject.replace(/^(Re:\s*|Fwd:\s*)+/ig, '').trim();
      if (!baseSubject) baseSubject = 'Message from CityQ';

      if (sendType === 'Forward') {
        setSubject(`Fwd: ${baseSubject}`);
        setMessageBody(
          `<br><br><br>
          <div class="gmail_quote">
            ---------- Forwarded message ---------<br>
            <strong>From:</strong> ${email.sender_email || email.user?.email}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Subject:</strong> ${email.subject || '(No Subject)'}<br>
            <strong>To:</strong> ${email.to || 'Unknown'}<br>
            <br>
            ${originalMessage}
          </div>`
        );
      } else {
        setSubject(`Re: ${baseSubject}`);
        setMessageBody(
          `<br><br><br>
          <div class="gmail_quote">
            On ${formattedDate}, ${email.sender_email || email.user?.email} wrote:<br>
            <blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">
              ${originalMessage}
            </blockquote>
          </div>`
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendType, email?.id]); 

  const handleTemplateChange = (templateName) => {
    setSelectedTemplate(templateName);
    const template = emailTemplates.find(t => t.name === templateName);

    if (template) {
      let rawHtml = template.response_html || '';
      const ERP_BASE_URL = 'https://cityqerp.ortusolis.in';
      rawHtml = rawHtml.replace(/(src|href)\s*=\s*(["']?)\/?(files\/)/gi, `$1=$2${ERP_BASE_URL}/$3`);

      let leadFirstName = 'there';
      if (email?.user?.name) {
        leadFirstName = email.user.name.split(' ')[0]; 
      } else if (email?.sender_name) {
        leadFirstName = email.sender_name.split(' ')[0];
      }

      rawHtml = rawHtml.replace(/\{\{[\s\S]*?first_name[\s\S]*?\}\}/gi, leadFirstName);
      setMessageBody(`${rawHtml}<br>${messageBody}`);
    }
  };

  const handleReplyClick = () => setSendType('Reply');
  const handleForwardClick = () => {
    setSendType('Forward');
    setRecipients([]);
  };

  const handleGenerateDraft = async () => {
    if (!email) {
      enqueueSnackbar('No email context found!', { variant: 'error' });
      return;
    }
    
    setIsDrafting(true);
    const originalBody = messageBody; 
    let currentDraft = ''; 

    try {
      const targetRecipient = recipients.length > 0 
        ? recipients.join(', ') 
        : (email.sender_email || email.user?.email || email.user?.name || 'Customer');

      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailThread: email.details || email.content || '',
          instructions: aiInstruction,
          senderEmail: FROM_EMAIL,
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
              setMessageBody(`${formattedDraft}<br><br><hr><br>${originalBody}`);
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
      setMessageBody(originalBody); 
      enqueueSnackbar('Failed to generate AI draft', { variant: 'error' });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);

    const payload = {
      lead_id: email?.reference_name || email?.lead || '',
      from: FROM_EMAIL,
      recipients: recipients.map(extractEmail).join(','),
      cc: '',
      bcc: '',
      subject: subject,
      content: messageBody,
      send_me_a_copy: 0,
      read_receipt: 0,
      schedule_at: null
    };

    try {
      const res = await fetch('/api/lead/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        enqueueSnackbar(`${sendType} sent successfully!`, { variant: 'success' });
        setSendType('');
        setMessageBody('');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Send Error:', error);
      enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {!sendType ? (
        <Box sx={{ mt: 8 }}>
          <Button
            variant="soft"
            color="neutral"
            sx={{ mr: 1 }}
            startIcon={<IconifyIcon icon="material-symbols:reply-rounded" sx={{ fontSize: 20 }} />}
            onClick={handleReplyClick}
          >
            Reply
          </Button>
          <Button
            variant="soft"
            color="neutral"
            startIcon={<IconifyIcon icon="material-symbols:forward-rounded" sx={{ fontSize: 20 }} />}
            onClick={handleForwardClick}
          >
            Forward
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSend} sx={{ bgcolor: 'background.elevation2', p: 2, borderRadius: 6, mt: 8 }}>

          <SendOptionInput
            sendType={sendType}
            setSendType={setSendType}
            emailData={email} 
            recipients={recipients}
            setRecipients={setRecipients}
          />

          <TextField
            fullWidth
            size="small"
            variant="filled"
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mt: 2 }}
          />

          <TextField
            select
            fullWidth
            size="small"
            variant="filled"
            label="Insert Email Template"
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {emailTemplates.map(t => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
          </TextField>

          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Tell AI how to reply (e.g., 'Say yes for Thursday at 2 PM')..."
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              disabled={isDrafting}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <Button
              type="button" 
              disabled={isDrafting}
              onClick={(e) => {
                e.preventDefault(); 
                e.stopPropagation();
                handleGenerateDraft(); 
              }}
              sx={{
                height: '40px',
                bgcolor: '#EAF3FD',
                color: '#3385F0',
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#DBE6EB' }
              }}
              startIcon={isDrafting ? <CircularProgress size={16} /> : <IconifyIcon icon="material-symbols:auto-awesome" />}
            >
              {isDrafting ? 'Drafting...' : 'AI Draft'}
            </Button>
          </Stack>

          <EmailComposeEditor
            content={messageBody}
            onChange={setMessageBody}
            isValid={recipients.length > 0 && subject.trim().length > 0 && !isSending}
          />

        </Box>
      )}
    </>
  );
};

export default React.memo(EmailReply);