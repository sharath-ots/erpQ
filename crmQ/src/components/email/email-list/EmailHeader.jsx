'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 🚀 Swapped useParams for usePathname
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

  const context = useEmailContext() || {};
  const emailDispatch = context.emailDispatch;
  const resizableWidth = context.resizableWidth;

  // 🚀 FIXED: Extract label from path (since useParams might be empty in your shell)
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const isDetailsView = pathname.includes('/details/');
  const currentLabel = isDetailsView
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  const toggleFilterDialog = () => setOpenFilterDialog((prev) => !prev);
  const toggleComposeDialog = () => setOpenComposeDialog(!openComposeDialog);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (emailDispatch) {
      emailDispatch({
        type: SEARCH_EMAIL,
        payload: { query: value, folder: currentLabel },
      });
    }
  };

  const handleRefresh = () => {
    setSearchText('');
    if (emailDispatch) {
      emailDispatch({ type: REFRESH_EMAILS, payload: currentLabel });
    }
  };

  // 🚀 CRASH-PROOF EFFECT
  useEffect(() => {
    setSearchText('');
    if (emailDispatch && currentLabel !== 'email') {
      emailDispatch({ type: SEARCH_EMAIL, payload: { query: '', folder: currentLabel } });
    }
    return undefined; // 🚀 THIS STOPS THE "s is not a function" ERROR
  }, [currentLabel, emailDispatch]);

  return (
    <Box sx={{ mb: '2px' }}>
      <Stack
        spacing={1}
        sx={{ px: 3, flexWrap: 'wrap' }}
      >
        <Button color="neutral" variant="soft" shape="square" onClick={toggleDrawer}>
          <IconifyIcon icon="material-symbols:filter-list-rounded" fontSize={20} />
        </Button>
        <Button
          variant="contained"
          onClick={toggleComposeDialog}
          sx={{ flex: 1 }}
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
          sx={{ order: 1, width: 1, flex: { sm: 1 } }}
        />
        <Box sx={{ ml: 'auto' }}>
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