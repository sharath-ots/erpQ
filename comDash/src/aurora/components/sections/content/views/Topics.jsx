'use client';

import { useState } from 'react';
import { Container, InputAdornment, Stack, Typography } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import TopicsContainer from 'components/sections/content/topics';
import StyledTextField from 'components/styled/StyledTextField';

const ContentTopics = () => {
  const [query, setQuery] = useState('');

  return (
    <Container
      maxWidth="md"
      sx={{
        p: { xs: 3, md: 5 },
      }}
    >
      <Stack
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          mb: { xs: 3, sm: 5 },
        }}
      >
        <Typography variant="h4">Topic</Typography>

        <StyledTextField
          id="search-box"
          type="search"
          fullWidth
          size="large"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon="material-symbols:search-rounded" fontSize={16} />
                </InputAdornment>
              ),
              sx: {
                pl: '16px !important',
              },
            },
          }}
          sx={{
            maxWidth: 400,
            flexGrow: { xs: 1, sm: 0 },
          }}
        />
      </Stack>

      <TopicsContainer searchQuery={query} />
    </Container>
  );
};

export default ContentTopics;
