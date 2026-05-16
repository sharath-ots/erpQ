'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import IconifyIcon from 'components/base/IconifyIcon';
import SendOptionInput from './SendOptionInput';
import EmailComposeEditor from '../common/EmailComposeEditor';

const EmailReply = ({ emailData }) => {
  const [sendType, setSendType] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();

  const extractEmail = (str) => {
    if (!str) return '';
    const match = str.match(/<(.+)>/);
    return match ? match[1].trim() : str.trim();
  };

  const rawToAddress = emailData?.to ? emailData.to.split(',')[0] : '';
  const FROM_EMAIL = extractEmail(rawToAddress) || 'salesq@cityq.biz';

  useEffect(() => {
    setSendType('');
    setSelectedTemplate('');
    setRecipients([]);
  }, [pathname, emailData]);

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

  // 🚀 THE FORWARD FIX: Formats the rich text exactly like Gmail does!
  useEffect(() => {
    if (sendType && emailData) {
      const originalMessage = emailData.details || emailData.content || '';
      const formattedDate = new Date(emailData.time).toLocaleString();

      if (sendType === 'Forward') {
        // Standard Forward Header Block
        setMessageBody(
          `<br><br><br>
          <div class="gmail_quote">
            ---------- Forwarded message ---------<br>
            <strong>From:</strong> ${emailData.sender_email || emailData.user?.email}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Subject:</strong> ${emailData.subject}<br>
            <strong>To:</strong> ${emailData.to || 'Unknown'}<br>
            <br>
            ${originalMessage}
          </div>`
        );
      } else {
        // Standard Reply Block
        setMessageBody(
          `<br><br><br>
          <div class="gmail_quote">
            On ${formattedDate}, ${emailData.sender_email || emailData.user?.email} wrote:<br>
            <blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">
              ${originalMessage}
            </blockquote>
          </div>`
        );
      }
    }
  }, [sendType, emailData]);

  const handleTemplateChange = (templateName) => {
    setSelectedTemplate(templateName);
    const template = emailTemplates.find(t => t.name === templateName);
    if (template) {
      setMessageBody(`${template.response_html || ''}<br>${messageBody}`);
    }
  };

  const handleReplyClick = () => {
    setSendType('Reply');
    const targetEmail = emailData?.sender_email || emailData?.user?.email || '';
    if (targetEmail) {
      setRecipients([targetEmail]);
    }
  };

  const handleForwardClick = () => {
    setSendType('Forward');
    setRecipients([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);

    const payload = {
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
            emailData={emailData}
            recipients={recipients}
            setRecipients={setRecipients}
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

          <EmailComposeEditor
            content={messageBody}
            onChange={setMessageBody}
            isValid={recipients.length > 0 && !isSending}
          />

        </Box>
      )}
    </>
  );
};

export default EmailReply;