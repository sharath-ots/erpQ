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

  useEffect(() => {
    const extractEmail = (str) => {
      if (!str) return '';
      const match = str.match(/<(.+)>/);
      return match ? match[1].trim() : str.trim();
    };

    if (sendType === 'Reply') {
      let targetEmail = extractEmail(emailData?.sender_email || emailData?.user?.email || '');
      const cleanTo = extractEmail(emailData?.to || '');

      // 🚀 THE SMART FIX: If the email was sent BY us (@cityq.biz), reply TO the customer!
      if (targetEmail.includes('@cityq.biz') && cleanTo) {
        targetEmail = cleanTo;
      }

      if (targetEmail) {
        setRecipients([targetEmail]);
      }
    } else if (sendType === 'Forward') {
      setRecipients([]);
    }
  }, [sendType, emailData, setRecipients]);

  return (
    // 🚀 Reverted back to the side-by-side layout you had earlier
    <Stack sx={{ flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>

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
          sx={{ alignSelf: 'flex-start', minWidth: 140 }}
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
        onChange={(event, newValue) => {
          const expandedValues = newValue.reduce((acc, curr) => {
            const splitEmails = curr.split(/[,\s]+/).filter(Boolean);
            return [...acc, ...splitEmails];
          }, []);
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
                height: 'auto', // Keeps the multi-email expansion working!
                flexWrap: 'wrap',
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