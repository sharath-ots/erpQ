'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import IconifyIcon from 'components/base/IconifyIcon';
import SendOptionInput from './SendOptionInput';
import EmailComposeEditor from '../common/EmailComposeEditor';

// Hardcoded sender to match your configuration
const FROM_EMAIL = 'salesq@cityq.biz';

const EmailReply = ({ emailData }) => {
  const [sendType, setSendType] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Template States
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();

  // Reset when navigating or changing emails
  useEffect(() => {
    setSendType('');
    setSelectedTemplate('');
  }, [pathname, emailData]);

  // Fetch ERP Templates on load
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/email-template/email-templates');
        if (res.ok) {
          const data = await res.json();
          setEmailTemplates(data || []);
        }
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    };
    fetchTemplates();
  }, []);

  // Set initial body with the quoted original message
  useEffect(() => {
    if (sendType && emailData) {
      const originalMessage = emailData.details || emailData.content || '';
      setMessageBody(`<br><br><br>--- Original Message ---<br>${originalMessage}`);
    }
  }, [sendType, emailData]);

  // Append Template to the current body
  const handleTemplateChange = (templateName) => {
    setSelectedTemplate(templateName);
    const template = emailTemplates.find(t => t.name === templateName);
    if (template) {
      setMessageBody(`${template.response_html || ''}<br>${messageBody}`);
    }
  };

  // Extract raw email from "Name <email@domain.com>"
  const extractEmail = (str) => {
    if (!str) return '';
    const match = str.match(/<(.+)>/);
    return match ? match[1].trim() : str.trim();
  };

  const handleSend = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    setIsSending(true);

    const payload = {
      // 🚀 EXPERT FIX: Frappe stores the parent Lead ID in 'reference_name'
      lead_id: emailData?.reference_name || emailData?.lead || '',
      from: FROM_EMAIL,
      recipients: recipients.map(extractEmail).join(','),
      cc: '',
      bcc: '',
      subject: sendType === 'Forward' ? `Fwd: ${emailData?.subject || ''}` : `Re: ${emailData?.subject || ''}`,
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
        setSendType(''); // Close the reply box
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
            onClick={() => setSendType('Reply')}
          >
            Reply
          </Button>
          <Button
            variant="soft"
            color="neutral"
            startIcon={<IconifyIcon icon="material-symbols:forward-rounded" sx={{ fontSize: 20 }} />}
            onClick={() => setSendType('Forward')}
          >
            Forward
          </Button>
        </Box>
      ) : (
        // 🚀 EXPERT FIX: Wrapped in a <form> so the Editor's native Send button triggers handleSend!
        <Box component="form" onSubmit={handleSend} sx={{ bgcolor: 'background.elevation2', p: 2, borderRadius: 6, mt: 8 }}>

          <SendOptionInput
            sendType={sendType}
            setSendType={setSendType}
            emailData={emailData}
            recipients={recipients}
            setRecipients={setRecipients}
          />

          {/* 🚀 ERP Template Selector! */}
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

          {/* 🚀 Replaced dead buttons with the working Rich Text Editor */}
          <EmailComposeEditor
            content={messageBody}
            onChange={setMessageBody}
            isValid={recipients.length > 0 && !isSending} // Disables send button if no recipient
          />

        </Box>
      )}
    </>
  );
};

export default EmailReply;