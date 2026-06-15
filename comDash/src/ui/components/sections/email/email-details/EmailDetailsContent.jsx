'use client'; // 🚀 Keep this at the top

import React, { useState } from 'react'; // 🚀 Added useState
import { Avatar, Box, Stack, Typography, Button, CircularProgress } from '@mui/material'; // 🚀 Added Button, CircularProgress
import dayjs from 'dayjs';
import { useEmailContext } from 'providers/EmailProvider';
import Image from 'components/base/Image';
import IconifyIcon from 'components/base/IconifyIcon'; // 🚀 Added Icon
import { useSnackbar } from 'notistack'; // 🚀 Added Snackbar for errors

const EmailDetailsContent = ({ email: propEmail }) => {
  const { emailState } = useEmailContext();
  const email = propEmail || emailState?.email;
  const { enqueueSnackbar } = useSnackbar();

  // 🚀 AI Summarize State
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    if (!email?.details) return;
    setIsSummarizing(true);
    setSummary(''); // 🚀 Set to empty string, not null

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailThread: email.details })
      });

      if (!response.ok) throw new Error('Failed to reach AI API');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsSummarizing(false); // 🚀 Ensure loader stops when done
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue; 
          
          try {
            const json = JSON.parse(line);
            // 🚀 THE FIX: Read 'json.response' directly from Ollama
            if (json.response) {
              setSummary((prev) => prev + json.response);
            }
          } catch (e) {
            console.debug('Streaming chunk parsing skip');
          }
        }
      }
    } catch (error) {
      enqueueSnackbar('AI Summarization failed: ' + error.message, { variant: 'error' });
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!email) return null;

  return (
    <>
      <Typography variant="h4" sx={{ fontWeight: 400, my: 3 }}>
        {email?.subject}
      </Typography>

      {/* 🚀 AI Summarize UI Block */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          disabled={isSummarizing}
          onClick={handleSummarize}
          startIcon={isSummarizing ? <CircularProgress size={16} /> : <IconifyIcon icon="material-symbols:auto-awesome" />}
        >
          {isSummarizing ? 'Summarizing...' : 'Summarize with AI'}
        </Button>
      </Stack>

      {summary && (
        <Box sx={{ p: 2, mb: 3, bgcolor: 'background.elevation2', borderRadius: 2, borderLeft: '4px solid #3385F0' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>AI Summary:</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{summary}</Typography>
        </Box>
      )}
      <Stack spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Avatar alt={email?.user?.name} src={email?.user?.avatar} sx={{ width: 32, height: 32 }} />
        <div>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {email?.user?.name || 'Unknown User'}
          </Typography>
          <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            {email?.user?.email || 'No Email'}
          </Typography>
          <Typography variant="caption" sx={{ mr: 0.5, color: 'text.disabled' }}>
            To:{' '}
          </Typography>
          <Typography variant="caption">{email?.to || 'Unknown'}</Typography>
        </div>
        <Typography variant="body2" sx={{ ml: 'auto' }}>
          {email?.time ? dayjs(email.time).fromNow() : ''}
        </Typography>
      </Stack>

      <Box
        sx={{
          typography: 'body2',
          '& p': { mt: 0, mb: 1.5 },
          '& a': { color: 'primary.main', textDecoration: 'none' },
          '& strong': { fontWeight: 600 }
        }}
        dangerouslySetInnerHTML={{
          __html: typeof email?.details === 'string' ? email.details : ''
        }}
      />

      {email?.attachments && Array.isArray(email.attachments) && (
        <Stack direction="column" spacing={2} sx={{ alignItems: 'start', mt: 3 }}>
          {email.attachments.map(
            (attachment) =>
              attachment?.fileType === 'image' && (
                <Image
                  key={attachment.id || attachment.name}
                  src={attachment.file}
                  alt=""
                  width={320}
                  height={320}
                  sx={{ height: 'auto', maxWidth: 320, width: 1 }}
                />
              ),
          )}
        </Stack>
      )}
    </>
  );
};

export default React.memo(EmailDetailsContent);