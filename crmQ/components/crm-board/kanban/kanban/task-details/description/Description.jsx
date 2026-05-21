import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledTextField from 'components/styled/StyledTextField';

const Description = () => {
  const [isActiveEditMode, setIsActiveEditMode] = useState(false);
  const { watch, control } = useFormContext();

  const description = watch('description');

  return (
    <Paper sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Description
      </Typography>
      
      <Stack
        spacing={1}
        alignItems="flex-start"
        sx={[
          {
            px: 3,
            py: 2,
            height: 'auto',
            minHeight: 100,
            bgcolor: 'background.elevation2',
            borderRadius: 2,
            position: 'relative'
          },
          isActiveEditMode && { px: 0, py: 0, bgcolor: 'transparent' },
        ]}
      >
        {!isActiveEditMode ? (
          <>
            <Typography 
              variant="body1" 
              sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', width: '100%', pr: 4 }}
            >
              {description || "Add a more detailed description..."}
            </Typography>
            
            <IconButton 
              onClick={() => setIsActiveEditMode(true)} 
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <IconifyIcon
                icon="material-symbols:edit-outline"
                sx={{ color: 'text.primary', fontSize: 20 }}
              />
            </IconButton>
          </>
        ) : (
          /* 🚀 THE FIX: We use Controller so react-hook-form tracks every keystroke! */
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Box sx={{ width: '100%' }}>
                <StyledTextField
                  {...field}
                  multiline
                  minRows={4}
                  fullWidth
                  autoFocus
                  placeholder="Add a more detailed description..."
                  sx={{ mb: 2 }}
                />
                <Stack direction="row" spacing={1}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="small"
                    onClick={() => setIsActiveEditMode(false)}
                  >
                    Done
                  </Button>
                </Stack>
              </Box>
            )}
          />
        )}
      </Stack>
    </Paper>
  );
};

export default Description;