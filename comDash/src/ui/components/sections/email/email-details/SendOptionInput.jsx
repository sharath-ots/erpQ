'use client';

import { useEffect } from 'react';
import {
  Autocomplete,
  Avatar,
  buttonBaseClasses,
  Chip,
  inputBaseClasses,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';

import IconifyIcon from 'components/base/IconifyIcon';
import StyledFormControl from 'components/styled/StyledFormControl';
import StyledSelect from 'components/styled/StyledSelect';
import StyledTextField from 'components/styled/StyledTextField';

const SendOptionInput = ({ setSendType, sendType, emailData, recipients, setRecipients }) => {
  const email = emailData;
  const targetEmail = email?.sender_email || email?.user?.email || '';

  useEffect(() => {
    if (sendType === 'Reply' && targetEmail) {
      setRecipients([targetEmail]);
    } else if (sendType === 'Forward') {
      // Ensure it stays blank when switching to Forward
      setRecipients([]);
    }
  }, [sendType, targetEmail, setRecipients]);

  return (
    <Stack sx={{ flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
      <StyledFormControl>
        <StyledSelect
          variant="filled"
          inputProps={{ 'aria-label': 'Send type' }}
          value={sendType}
          onChange={(event) => setSendType(event.target.value)}
          renderValue={() => (
            <Typography
              variant="subtitle2"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 3 }}
            >
              <IconifyIcon
                icon={
                  sendType === 'Reply'
                    ? 'material-symbols:reply-rounded'
                    : 'material-symbols:forward-rounded'
                }
                sx={{ fontSize: 20 }}
              />
              {sendType}
            </Typography>
          )}
          sx={{ alignSelf: 'flex-start' }}
        >
          <MenuItem value="Reply">
            <IconifyIcon icon="material-symbols:reply-rounded" sx={{ fontSize: 20, mr: 1 }} />
            Reply
          </MenuItem>
          <MenuItem value="Forward">
            <IconifyIcon icon="material-symbols:forward-rounded" sx={{ fontSize: 20, mr: 1 }} />
            Forward
          </MenuItem>
        </StyledSelect>
      </StyledFormControl>

      <Autocomplete
        sx={{ flex: 1 }}
        multiple
        freeSolo
        options={[]}
        value={recipients || []}
        disableClearable
        // 🚀 THE MULTI-EMAIL FIX: Automatically splits pasted lists by commas or spaces into separate chips!
        onChange={(event, newValue) => {
          const expandedValues = newValue.reduce((acc, curr) => {
            const splitEmails = curr.split(/[,\s]+/).filter(Boolean);
            return [...acc, ...splitEmails];
          }, []);
          // Removes duplicates automatically
          setRecipients([...new Set(expandedValues)]);
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...rest } = getTagProps({ index });

            return (
              <Chip
                key={key}
                variant="outlined"
                size="medium"
                sx={{ [`&.${buttonBaseClasses.root}`]: { mt: 0 } }}
                avatar={
                  option === targetEmail ? (
                    <Avatar alt={email?.sender || 'User'} src={email?.user?.avatar} />
                  ) : undefined
                }
                color="neutral"
                label={option}
                {...rest}
              />
            );
          })
        }
        renderInput={(params) => (
          <StyledTextField
            {...params}
            type="email"
            sx={{
              [`& .${inputBaseClasses.root}`]: {
                bgcolor: 'unset',
                gap: 0.5,
                ['&:hover']: { bgcolor: 'unset' },
                [`&.${inputBaseClasses.focused}`]: {
                  bgcolor: 'unset !important',
                  boxShadow: 'none',
                },
              },
            }}
            variant="filled"
            placeholder="Type email and press Enter..."
          />
        )}
      />
    </Stack>
  );
};

export default SendOptionInput;