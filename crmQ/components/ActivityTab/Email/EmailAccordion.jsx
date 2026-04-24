'use client';

import { useState, useEffect } from 'react';
import {
  Box, Button, Collapse, Stack, Typography, TextField,
  Avatar, Chip, Divider, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
  Autocomplete, Checkbox, FormControlLabel, MenuItem, Select, Grid
} from '@mui/material';
import dayjs from 'dayjs';
import SimpleBar from '@/shared-ui/components/base/SimpleBar';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import EmailComposeEditor from 'components/email/common/EmailComposeEditor';

const EmailAccordion = ({ email, leadId }) => {
  const [open, setOpen] = useState(false);
  const [openReplyModal, setOpenReplyModal] = useState(false);

  // --- 🚀 ERP DATA STATES ---
  const [availableFromEmails, setAvailableFromEmails] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [allContacts, setAllContacts] = useState([]); // Merged Leads + Users

  // --- FORM STATES ---
  const [fromEmail, setFromEmail] = useState('');
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [bccEmails, setBccEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [sendMeCopy, setSendMeCopy] = useState(false);
  const [sendReadReceipt, setSendReadReceipt] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // --- 1. FETCH ALL ERP DATA (Templates, Users, Leads) ---
  useEffect(() => {
    const fetchERPData = async () => {
      try {
        // Fetch Templates
        const templateRes = await fetch('/api/email-template/email-templates');
        if (templateRes.ok) {
          const templates = await templateRes.json();
          setEmailTemplates(templates || []);
        }

        // Fetch Users (for From dropdown and CC/BCC)
        const userRes = await fetch('/api/users/system-users');
        if (userRes.ok) {
          const users = await userRes.json();
          const userEmails = users.map(u => u.name); // 'name' is the email in Frappe
          setAvailableFromEmails(userEmails);
          if (userEmails.length > 0) setFromEmail(userEmails[0]);

          // Fetch Lead Emails
          const leadRes = await fetch('/api/lead/all-leads-emails');
          const leads = leadRes.ok ? await leadRes.json() : [];

          // 🧠 MERGE CONTACTS: Format as "Name <email@id.com>" for better UX
          const formattedUsers = users.map(u => `${u.full_name} <${u.name}>`);
          const formattedLeads = leads.map(l => `${l.lead_name} <${l.email_id}>`);
          setAllContacts([...formattedUsers, ...formattedLeads]);
        }
      } catch (err) {
        console.error("ERP Data fetch failed", err);
      }
    };

    // Only fetch if modal is opened to save initial load time, or fetch immediately if preferred
    fetchERPData();
  }, []);

  // --- 2. INITIALIZE "TO" AND "SUBJECT" FROM CURRENT EMAIL ---
  useEffect(() => {
    if (email) {
      const defaultTo = email.sender_email || email.sender || email.name;
      setToEmails(defaultTo ? [defaultTo] : []);
      setSubject(`Re: ${email.subject || 'Follow Up'}`);

      const rawMsg = typeof email.message === 'string' ? email.message : '';
      setMessageBody(`<br><br>--- Original Message ---<br>${rawMsg}`);
    }
  }, [email]);

  if (!email) return null;

  // --- 3. HANDLE TEMPLATE SELECTION ---
  const handleTemplateChange = (templateName) => {
    const template = emailTemplates.find(t => t.name === templateName);
    setSelectedTemplate(templateName);

    if (template) {
      setSubject(template.subject || subject);
      // ERP Style: Prepend the template HTML to the existing body
      const newBody = `${template.response_html || ''}<br>${messageBody}`;
      setMessageBody(newBody);
    }
  };

  // --- 4. LITERAL SEND ACTION ---
  const handleSend = async () => {
    setIsSending(true);

    // Extract actual emails from "Name <email@id.com>" format for Frappe
    const extractEmail = (str) => {
      const match = str.match(/<(.+)>/);
      return match ? match[1] : str;
    };

    const payload = {
      lead_id: leadId,
      from: fromEmail,
      recipients: toEmails.map(extractEmail).join(','),
      cc: ccEmails.map(extractEmail).join(','),
      bcc: bccEmails.map(extractEmail).join(','),
      subject: subject,
      content: messageBody,
      send_me_a_copy: sendMeCopy ? 1 : 0,
      read_receipt: sendReadReceipt ? 1 : 0,
      schedule_at: scheduleAt ? dayjs(scheduleAt).format('YYYY-MM-DD HH:mm:ss') : null
    };

    try {
      const res = await fetch('/api/lead/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setOpenReplyModal(false);
        alert("Email sent successfully!");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to send email");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const labelStyle = { fontSize: '0.7rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', mb: 0.5, ml: 0.5 };
  const autoCompleteProps = {
    multiple: true, freeSolo: true, options: allContacts, size: "small",
    renderTags: (v, p) => v.map((opt, i) => <Chip label={opt} size="small" color="primary" variant="outlined" {...p({ i })} />),
    sx: { '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }
  };

  return (
    <>
      {/* --- ACCORDION VIEW --- */}
      <Paper elevation={0} sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: open ? 'primary.main' : 'divider', overflow: 'hidden', transition: 'all 0.2s' }}>
        <Stack direction="row" onClick={() => setOpen(!open)} sx={{ p: 2, cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', bgcolor: open ? 'primary.soft' : 'transparent' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 36, height: 36, fontSize: '1rem', fontWeight: 700 }}>
              {email.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{email.name || email.sender_email}</Typography>
              <Typography variant="caption" color="text.secondary">{email.subject}</Typography>
            </Box>
          </Stack>
          <IconifyIcon icon={open ? "material-symbols:keyboard-arrow-up-rounded" : "material-symbols:keyboard-arrow-down-rounded"} />
        </Stack>

        <Collapse in={open}>
          <Divider />
          <Box sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ typography: 'body2', color: 'text.primary', '& img': { maxWidth: '100%' } }}>
              {typeof email.message === 'string' ? <div dangerouslySetInnerHTML={{ __html: email.message }} /> : <Typography variant="body2">{email.message}</Typography>}
            </Box>
            <Button variant="contained" startIcon={<IconifyIcon icon="material-symbols:reply-rounded" />} sx={{ mt: 3, borderRadius: 2, fontWeight: 700, boxShadow: 'none' }} onClick={(e) => { e.stopPropagation(); setOpenReplyModal(true); }}>
              Reply to Message
            </Button>
          </Box>
        </Collapse>
      </Paper>

      {/* --- 🚀 THE FULL ERP COMPOSER MODAL --- */}
      <Dialog open={openReplyModal} onClose={() => setOpenReplyModal(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4, m: 2, bgcolor: 'background.default' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Compose Reply</Typography>
          <IconButton onClick={() => setOpenReplyModal(false)} sx={{ bgcolor: 'action.hover' }}><IconifyIcon icon="material-symbols:close" /></IconButton>
        </DialogTitle>

        <SimpleBar sx={{ maxHeight: '75vh' }}>
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3}>

              {/* --- ROUTING SECTION (From, To, CC, BCC) --- */}
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>From *</Typography>
                    <Select fullWidth size="small" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} sx={{ bgcolor: 'background.paper' }}>
                      {availableFromEmails.map(mail => <MenuItem key={mail} value={mail}>{mail}</MenuItem>)}
                    </Select>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>Insert ERP Template</Typography>
                    <Select fullWidth size="small" displayEmpty value={selectedTemplate} onChange={(e) => handleTemplateChange(e.target.value)} sx={{ bgcolor: 'background.paper' }}>
                      <MenuItem value=""><em>No Template</em></MenuItem>
                      {emailTemplates.map(t => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
                    </Select>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography sx={labelStyle}>To *</Typography>
                    <Autocomplete {...autoCompleteProps} value={toEmails} onChange={(_, val) => setToEmails(val)} renderInput={(params) => <TextField {...params} variant="outlined" />} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>CC</Typography>
                    <Autocomplete {...autoCompleteProps} value={ccEmails} onChange={(_, val) => setCcEmails(val)} renderInput={(params) => <TextField {...params} variant="outlined" />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>BCC</Typography>
                    <Autocomplete {...autoCompleteProps} value={bccEmails} onChange={(_, val) => setBccEmails(val)} renderInput={(params) => <TextField {...params} variant="outlined" />} />
                  </Grid>
                </Grid>
              </Box>

              {/* --- CONTENT SECTION (Subject, Editor, Schedule) --- */}
              <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={8}>
                    <Typography sx={labelStyle}>Subject *</Typography>
                    <TextField fullWidth size="small" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography sx={labelStyle}>Schedule Send (Optional)</Typography>
                    <TextField type="datetime-local" fullWidth size="small" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  </Grid>
                </Grid>

                <Typography sx={labelStyle}>Message Body</Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', minHeight: 300 }}>
                  <EmailComposeEditor content={messageBody} onChange={setMessageBody} />
                </Box>
              </Box>

            </Stack>
          </DialogContent>
        </SimpleBar>

        {/* --- FOOTER ACTIONS --- */}
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={3}>
            <FormControlLabel control={<Checkbox size="small" checked={sendMeCopy} onChange={(e) => setSendMeCopy(e.target.checked)} />} label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Send me a copy</Typography>} />
            <FormControlLabel control={<Checkbox size="small" checked={sendReadReceipt} onChange={(e) => setSendReadReceipt(e.target.checked)} />} label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Request Read Receipt</Typography>} />
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button color="inherit" onClick={() => setOpenReplyModal(false)} sx={{ fontWeight: 700 }}>Discard</Button>
            <Button variant="contained" disabled={isSending || toEmails.length === 0 || !subject} sx={{ px: 4, borderRadius: 2, fontWeight: 800, boxShadow: 'none' }} onClick={handleSend}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmailAccordion;