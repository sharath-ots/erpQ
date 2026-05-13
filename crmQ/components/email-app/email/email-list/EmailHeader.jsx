'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 🚀 Swapped for reliability
import { Box, Button, Stack } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import { REFRESH_EMAILS, SEARCH_EMAIL } from 'reducers/EmailReducer';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailComposeDialog from 'components/sections/email/common/EmailComposeDialog';
import EmailFilterDialog from 'components/sections/email/common/EmailFilterDialog';
import StyledTextField from 'components/styled/StyledTextField';

const EmailHeader = ({ toggleDrawer }) => {
  const [searchText, setSearchText] = useState('');
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [openComposeDialog, setOpenComposeDialog] = useState(false);

  // 1. Get Context
  const context = useEmailContext() || {};
  const emailDispatch = context.emailDispatch;
  const resizableWidth = context.resizableWidth;

  // 2. 🚀 FIXED: Robust Folder Detection
  // useParams often returns 'undefined' in custom dashboard shells. 
  // We use usePathname to ensure we always know if we are in 'inbox', 'sent', etc.
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const isDetailsView = pathname.includes('/details/');
  const currentLabel = isDetailsView
    ? pathParts[pathParts.length - 2] // Grab 'inbox' from .../details/inbox/id
    : pathParts[pathParts.length - 1] || 'inbox';

  const toggleFilterDialog = () => setOpenFilterDialog((prev) => !prev);
  const toggleComposeDialog = () => setOpenComposeDialog(!openComposeDialog);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);
    if (emailDispatch) {
      emailDispatch({
        type: SEARCH_EMAIL,
        payload: { query: val, folder: currentLabel },
      });
    }
  };

  const handleRefresh = () => {
    setSearchText('');
    if (emailDispatch) {
      emailDispatch({ type: REFRESH_EMAILS, payload: currentLabel });
    }
  };

  // 3. 🚀 CRASH-PROOF EFFECT
  useEffect(() => {
    setSearchText('');
    if (emailDispatch && currentLabel && currentLabel !== 'email') {
      emailDispatch({
        type: SEARCH_EMAIL,
        payload: { query: '', folder: currentLabel }
      });
    }

    // 🚀 FIXED: Explicitly return undefined. 
    // This stops React from trying to run a "cleanup function" that doesn't exist.
    return undefined;
  }, [currentLabel, emailDispatch]);

  return (
    <Box sx={{ mb: '2px' }}>
      <Stack
        spacing={1}
        direction="row"
        sx={{ px: 3, flexWrap: 'nowrap', alignItems: 'center' }}
      >
        <Button color="neutral" variant="soft" shape="square" onClick={toggleDrawer}>
          <IconifyIcon icon="material-symbols:filter-list-rounded" fontSize={20} />
        </Button>
        <Button
          variant="contained"
          onClick={toggleComposeDialog}
          sx={{ whiteSpace: 'nowrap' }}
          startIcon={<IconifyIcon icon="material-symbols:add-2-rounded" sx={{ fontSize: 20 }} />}
        >
          Compose
        </Button>
        <StyledTextField
          id="search-box"
          type="search"
          value={searchText}
          onChange={handleSearch}
          placeholder="Search email"
          sx={{ flex: 1 }}
        />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button shape="square" color="neutral" onClick={toggleFilterDialog}>
            <IconifyIcon icon="material-symbols:filter-alt-outline" fontSize={20} />
          </Button>
          <Button color="neutral" shape="square" onClick={handleRefresh}>
            <IconifyIcon icon="material-symbols:refresh-rounded" fontSize={20} />
          </Button>
        </Box>
      </Stack>
      <EmailFilterDialog open={openFilterDialog} handleClose={toggleFilterDialog} />
      <EmailComposeDialog open={openComposeDialog} handleClose={toggleComposeDialog} />
    </Box>
  );
};

export default EmailHeader;