import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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

  // 🚀 SAFE CONTEXT EXTRACTION
  const context = useEmailContext() || {};
  const emailDispatch = context.emailDispatch;
  const resizableWidth = context.resizableWidth || 0;

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  // 🚀 FIXED URL LOGIC: Smarter extraction of label and ID
  let id = null;
  let label = 'inbox';

  if (pathname.includes('/details/')) {
    id = pathParts[pathParts.length - 1];
    label = pathParts[pathParts.length - 2];
  } else if (pathname.includes('/list/')) {
    label = pathParts[pathParts.length - 1];
  }

  const params = { label, id };

  const toggleFilterDialog = () => setOpenFilterDialog((prev) => !prev);
  const toggleComposeDialog = () => setOpenComposeDialog(!openComposeDialog);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);
    if (emailDispatch) {
      emailDispatch({
        type: SEARCH_EMAIL,
        payload: { query: val, folder: label },
      });
    }
  };

  const handleRefresh = () => {
    setSearchText('');
    if (emailDispatch) {
      emailDispatch({ type: REFRESH_EMAILS, payload: label });
    }
  };

  // 🚀 NUCLEAR useEffect FIX: Explicitly return undefined to stop the "s is not a function" error
  useEffect(() => {
    setSearchText('');
    if (emailDispatch) {
      emailDispatch({ type: SEARCH_EMAIL, payload: { query: '', folder: label } });
    }
    return undefined;
  }, [label, emailDispatch]);

  const isInvalidOrLargeWidth = !id || resizableWidth > 500;

  return (
    <Box sx={{ mb: '2px' }}>
      <Stack
        spacing={1}
        direction="row"
        sx={[
          { px: 3, flexWrap: 'wrap' },
          isInvalidOrLargeWidth && { px: { sm: 5 }, flexWrap: { sm: 'nowrap' } },
        ]}
      >
        <Button color="neutral" variant="soft" sx={{ minWidth: 40, p: 0 }} onClick={toggleDrawer}>
          <IconifyIcon icon="material-symbols:filter-list-rounded" fontSize={20} />
        </Button>
        <Button
          variant="contained"
          onClick={toggleComposeDialog}
          sx={[{ flex: 1 }, (!id || resizableWidth > 500) && { flex: { sm: 'unset' } }]}
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
          sx={[
            { order: 1, width: 1 },
            isInvalidOrLargeWidth && {
              order: { sm: 0 },
              width: { sm: 'auto' },
              flex: { sm: 1 },
            },
          ]}
        />
        <Box
          sx={[
            { mr: { xs: '-8px' }, ml: 'auto', display: 'flex', gap: 1 },
            isInvalidOrLargeWidth && { mr: { sm: '-10px' } },
          ]}
        >
          <Button sx={{ minWidth: 40, p: 0 }} color="neutral" onClick={toggleFilterDialog}>
            <IconifyIcon icon="material-symbols:filter-alt-outline" fontSize={20} />
          </Button>
          <Button color="neutral" sx={{ minWidth: 40, p: 0 }} onClick={handleRefresh}>
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