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
  const [subject, setSubject] = useState('');
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

  // Hidden default sender
  const rawToAddress = emailData?.to ? emailData.to.split(',')[0] : '';
  const FROM_EMAIL = extractEmail(rawToAddress) || 'salesq@cityq.biz';

  useEffect(() => {
    setSendType('');
    setSelectedTemplate('');
    setRecipients([]);
    setSubject('');
  }, [pathname, emailData]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // 🚀 FAST LOAD FIX: Only fetch templates if we don't already have them!
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

  useEffect(() => {
    if (sendType && emailData) {
      const originalMessage = emailData.details || emailData.content || '';
      const formattedDate = new Date(emailData.time).toLocaleString();

      let baseSubject = emailData.subject || '';
      baseSubject = baseSubject.replace(/^(Re:\s*|Fwd:\s*)+/ig, '').trim();
      if (!baseSubject) baseSubject = 'Message from CityQ';

      if (sendType === 'Forward') {
        setSubject(`Fwd: ${baseSubject}`);
        setMessageBody(
          `<br><br><br>
          <div class="gmail_quote">
            ---------- Forwarded message ---------<br>
            <strong>From:</strong> ${emailData.sender_email || emailData.user?.email}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Subject:</strong> ${emailData.subject || '(No Subject)'}<br>
            <strong>To:</strong> ${emailData.to || 'Unknown'}<br>
            <br>
            ${originalMessage}
          </div>`
        );
      } else {
        setSubject(`Re: ${baseSubject}`);
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

  // Append Template to the current body
  const handleTemplateChange = (templateName) => {
    setSelectedTemplate(templateName);
    const template = emailTemplates.find(t => t.name === templateName);

    if (template) {
      let rawHtml = template.response_html || '';

      const ERP_BASE_URL = 'https://cityqerp.ortusolis.in';

      // 🚀 FIX 1: BULLETPROOF IMAGE & LINK REPLACER
      // This catches src= or href=, single or double quotes, and missing leading slashes!
      rawHtml = rawHtml.replace(/(src|href)\s*=\s*(["']?)\/?(files\/)/gi, `$1=$2${ERP_BASE_URL}/$3`);

      // 🚀 FIX 2: BULLETPROOF JINJA VARIABLE REPLACER
      let leadFirstName = 'there';
      if (emailData?.user?.name) {
        leadFirstName = emailData.user.name.split(' ')[0]; // Grabs just the first name
      } else if (emailData?.sender_name) {
        leadFirstName = emailData.sender_name.split(' ')[0];
      }

      // This safely replaces anything inside {{ }} that contains "first_name", even if it has HTML code or line breaks inside it
      rawHtml = rawHtml.replace(/\{\{[\s\S]*?first_name[\s\S]*?\}\}/gi, leadFirstName);

      setMessageBody(`${rawHtml}<br>${messageBody}`);
    }
  };

  const handleReplyClick = () => {
    setSendType('Reply');
    // Target assignment moved safely inside SendOptionInput
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
            emailData={emailData}
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

export default EmailReply;