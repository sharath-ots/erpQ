import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse, { collapseClasses } from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useTheme, useMediaQuery } from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import Image from '@/shared-ui/components/base/Image';
import CRMDropdownMenu from '@/shared-ui/components/sections/crm/common/CRMDropdownMenu';
import EmailFile from './EmailFile';

import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
    Autocomplete,
    Dialog,
    dialogClasses,
    DialogContent,
    IconButton,
    TextField,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Divider,
    Grid
} from '@mui/material';
import { defaultEmails } from 'data/email/email';
import * as yup from 'yup';
import EmailComposeEditor from 'components/email/common/EmailComposeEditor';

// --- COMPOSE DIALOG SCHEMA ---
const emailComposeSchema = yup.object().shape({
    sender: yup.string().required('Sender is required'),
    to: yup.string().email('Must be a valid email!').required('This field is required!'),
    cc: yup.array().of(yup.string().email()).optional(),
    bcc: yup.array().of(yup.string().email()).optional(),
    subject: yup.string().optional(),
    body: yup.string().optional(),
    schedule_send: yup.string().optional(),
    email_template: yup.string().optional(),
    add_signature: yup.boolean().default(true),
    send_me_a_copy: yup.boolean().default(false),
    send_read_receipt: yup.boolean().default(false),
});

// --- COMPOSE DIALOG COMPONENT ---
const EmailComposeDialog = ({ open, handleClose, initialData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(emailComposeSchema),
        defaultValues: {
            sender: 'media@cityq.biz',
            add_signature: true,
            to: '',
            cc: [],
            bcc: []
        }
    });

    useEffect(() => {
        if (open) {
            reset({
                ...initialData,
                sender: initialData?.sender || 'media@cityq.biz',
                add_signature: true
            });
        }
    }, [open, initialData, reset]);

    const submitHandler = (data) => {
        console.log("Submitting CRM Email:", data);
        handleClose();
        reset();
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
                        position: isExpanded ? 'absolute' : 'fixed',
                        bottom: isExpanded ? 'unset' : '32px',
                        borderRadius: 6,
                        pointerEvents: 'auto',
                        margin: { xs: 2, sm: 4 },
                        maxWidth: isExpanded ? 900 : 746,
                        width: '100%',
                        boxShadow: theme.shadows[10],
                        height: 'max-content',
                        zIndex: 9999, // Guarantee it stays on top
                    }),
                },
            }}
            sx={{
                pointerEvents: isExpanded ? 'auto' : 'none',
                [`& .${dialogClasses.container}`]: {
                    justifyContent: isExpanded ? 'center' : 'flex-end',
                    alignItems: isExpanded ? 'center' : 'flex-end',
                },
            }}
            open={open}
        >
            <DialogContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
                        {initialData?.subject ? 'Reply' : 'New Message'}
                    </Typography>
                    <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
                        <IconifyIcon icon={isExpanded ? 'material-symbols:close-fullscreen' : 'material-symbols:open-in-full'} />
                    </IconButton>
                    <IconButton size="small" onClick={handleClose}>
                        <IconifyIcon icon="material-symbols:close-rounded" />
                    </IconButton>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TextField select fullWidth label="From" variant="standard" {...register('sender')} sx={{ mb: 2 }}>
                    <MenuItem value="media@cityq.biz">media@cityq.biz</MenuItem>
                    <MenuItem value="noreply@cityq.biz">noreply@cityq.biz</MenuItem>
                </TextField>
                <Stack spacing={2}>
                    <Controller name="to" control={control} render={({ field }) => (
                        <Autocomplete {...field} freeSolo options={defaultEmails} onChange={(_, val) => field.onChange(val)} renderInput={(params) => <TextField {...params} variant="standard" label="To" error={!!errors.to} />} />
                    )} />
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Controller name="cc" control={control} render={({ field }) => (
                                <Autocomplete {...field} multiple freeSolo options={defaultEmails} onChange={(_, val) => field.onChange(val)} renderInput={(params) => <TextField {...params} variant="standard" label="CC" />} />
                            )} />
                        </Grid>
                        <Grid item xs={6}>
                            <Controller name="bcc" control={control} render={({ field }) => (
                                <Autocomplete {...field} multiple freeSolo options={defaultEmails} onChange={(_, val) => field.onChange(val)} renderInput={(params) => <TextField {...params} variant="standard" label="BCC" />} />
                            )} />
                        </Grid>
                    </Grid>
                </Stack>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Schedule Send At" type="datetime-local" variant="outlined" InputLabelProps={{ shrink: true }} helperText="Timezone: Europe/Berlin" {...register('schedule_send')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Autocomplete fullWidth options={['Welcome Template', 'Follow-up', 'Product Intro']} renderInput={(params) => <TextField {...params} label="Email Template" />} />
                            <Button variant="tonal" color="primary" sx={{ height: 56, minWidth: 48 }}>
                                <IconifyIcon icon="material-symbols:add-box-outline" />
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
                <TextField fullWidth label="Subject" variant="standard" sx={{ my: 2 }} {...register('subject')} />
                <Controller name="body" control={control} render={({ field }) => (
                    <EmailComposeEditor onChange={field.onChange} content={field.value} isValid={!errors.body} />
                )} />
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.neutral', borderRadius: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1}>
                            <FormControlLabel control={<Checkbox size="small" {...register('add_signature')} />} label={<Typography variant="caption">Add Signature</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" {...register('send_me_a_copy')} />} label={<Typography variant="caption">Send me a copy</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" {...register('send_read_receipt')} />} label={<Typography variant="caption">Read Receipt</Typography>} />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" startIcon={<IconifyIcon icon="material-symbols:attach-file" />}>Attach</Button>
                            <Button variant="contained" type="submit" endIcon={<IconifyIcon icon="material-symbols:send-rounded" />}>Send</Button>
                        </Stack>
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

// --- MAIN ACCORDION COMPONENT ---
const EmailAccordion = ({ email }) => {
    const [open, setOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    // 🚀 The switch to open the compose file
    const [showCompose, setShowCompose] = useState(false);

    const theme = useTheme();
    const upSm = useMediaQuery(theme.breakpoints.up('sm'));

    return (
        <>
            <Stack
                direction="column"
                sx={{
                    borderRadius: 6,
                    p: 2,
                    mb: 2,
                    bgcolor: 'background.elevation1',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" gap={2} flexGrow={1} role="button" onClick={() => setOpen(!open)} sx={{ cursor: 'pointer', alignItems: 'center' }}>
                        <Stack direction="column" gap={0.5}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems="baseline">
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>{email.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    Sent via <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{email.sentVia || 'System'}</Box>
                                </Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                {dayjs(email.sentAt).format('h:mm a DD MMM, YYYY')}
                            </Typography>
                        </Stack>
                    </Stack>
                    <Box>
                        <Button size="small" sx={{ minWidth: 0, p: 0.5, color: 'text.disabled' }} onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}>
                            <IconifyIcon icon="material-symbols:more-horiz" sx={{ fontSize: 20 }} />
                        </Button>
                        <CRMDropdownMenu anchorEl={anchorEl} open={Boolean(anchorEl)} handleClose={() => setAnchorEl(null)} />
                    </Box>
                </Stack>

                <Collapse in={open} sx={{ [`& .${collapseClasses.wrapperInner}`]: { mt: 2 } }}>
                    <Stack direction="column" gap={2}>
                        <Typography variant="body2" component="div" sx={{ color: 'text.primary', whiteSpace: 'pre-line' }}>
                            {typeof email.message === 'string' && email.message.includes('<') ? (
                                <div dangerouslySetInnerHTML={{ __html: email.message }} />
                            ) : (
                                email.message
                            )}
                        </Typography>

                        {email.attachment && email.attachment.length > 0 && (
                            <Stack gap={2} direction="row" sx={{ flexWrap: 'wrap', mt: 1 }}>
                                {email.attachment.map((attachment) => (
                                    <Stack key={attachment.name} direction="column" gap={1}>
                                        <Box sx={{ borderRadius: 2, position: 'relative', overflow: 'hidden', width: 200, height: 200 }}>
                                            <Image src={attachment.src} sx={{ objectFit: 'cover', height: 1, width: 1, borderRadius: 2 }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                            {attachment.name} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>{' ' + attachment.size}</Box>
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        )}

                        {email.files && email.files.length > 0 && (
                            <Stack gap={1} direction="row" sx={{ flexWrap: 'wrap' }}>
                                {email.files.map((file) => (
                                    <EmailFile key={file.file?.name || Math.random()} file={file} />
                                ))}
                            </Stack>
                        )}

                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Button
                                variant="outlined"
                                size="small"
                                color="inherit"
                                startIcon={<IconifyIcon icon="material-symbols:reply-rounded" />}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: 'text.primary', borderColor: 'divider' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCompose(true);
                                    <EmailComposeDialog
                                        open={showCompose}
                                        handleClose={() => setShowCompose(false)}
                                        initialData={{
                                            to: email.sender_email || email.name,
                                            subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`
                                        }}
                                    />

                                    // 🚀 Flip the switch to open the dialog

                                }}
                            >
                                Reply
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                color="inherit"
                                startIcon={<IconifyIcon icon="material-symbols:reply-all-rounded" />}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: 'text.primary', borderColor: 'divider' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // 🚀 Flip the switch to open the dialog
                                    setShowCompose(true);
                                }}
                            >
                                Reply All
                            </Button>
                        </Stack>
                    </Stack>
                </Collapse>
            </Stack>

            {/* 🚀 The dialog lives here, waiting for the switch to turn TRUE */}
            {/* <EmailComposeDialog
                open={showCompose}
                handleClose={() => setShowCompose(false)}
                initialData={{
                    to: email.sender_email || email.name,
                    subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`
                }}
            /> */}
        </>
    );
};

export default EmailAccordion;