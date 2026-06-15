'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, Stack, CircularProgress } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import { INITIALIZE_EMAILS } from 'reducers/EmailReducer';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailComposeDialog from 'components/sections/email/common/EmailComposeDialog';
import EmailFilterDialog from 'components/sections/email/common/EmailFilterDialog';
import StyledTextField from 'components/styled/StyledTextField';

const EmailHeader = ({ toggleDrawer }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // 🚀 Start with the URL parameter if it exists
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [openComposeDialog, setOpenComposeDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const debounceTimer = useRef(null);

  const context = useEmailContext() || {};
  const emailDispatch = context.emailDispatch;
  const resizableWidth = context.resizableWidth || 0;

  const pathParts = pathname.split('/').filter(Boolean);
  const id = pathname.includes('/details/') ? pathParts[pathParts.length - 1] : null;

  const toggleFilterDialog = () => setOpenFilterDialog((prev) => !prev);
  const toggleComposeDialog = () => setOpenComposeDialog(!openComposeDialog);

  // Sync the input box if the URL changes (e.g. using back button)
  useEffect(() => {
    setSearchText(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);

    // 🚀 Debounce the URL update so we don't lag the router while typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set('search', val);
      } else {
        params.delete('search');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  };

  const handleRefresh = async () => {
    setSearchText('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    
    setIsRefreshing(true);
    sessionStorage.removeItem('erp_global_emails');

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/email-app?bypass=${timestamp}`, { cache: 'no-store' });
      const data = await res.json();

      if (!data.error) {
        try {
          sessionStorage.setItem('erp_global_emails', JSON.stringify(data));
        } catch (e) {
          sessionStorage.setItem('erp_global_emails', JSON.stringify(data.slice(0, 40)));
        }
        if (emailDispatch) {
          emailDispatch({ type: INITIALIZE_EMAILS, payload: data });
        }
      } else {
        alert("Failed to refresh: " + data.error);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

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
        
        {/* 🚀 Make sure ID is exactly "search-box" so the interceptor catches it */}
        <StyledTextField
          id="search-box"
          type="search"
          value={searchText}
          onChange={handleSearch}
          placeholder="Search all emails..."
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
          {/* <Button sx={{ minWidth: 40, p: 0 }} color="neutral" onClick={toggleFilterDialog}>
            <IconifyIcon icon="material-symbols:filter-alt-outline" fontSize={20} />
          </Button> */}
          <Button
            color="neutral"
            sx={{ minWidth: 40, p: 0 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <IconifyIcon icon="material-symbols:refresh-rounded" fontSize={20} />
            )}
          </Button>
        </Box>
      </Stack>
      <EmailFilterDialog open={openFilterDialog} handleClose={toggleFilterDialog} />
      <EmailComposeDialog open={openComposeDialog} handleClose={toggleComposeDialog} />
    </Box>
  );
};

export default EmailHeader;