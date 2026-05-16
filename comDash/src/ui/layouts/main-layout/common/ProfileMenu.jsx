'use client';

import {
  Box,
  Button,
  Divider,
  Link,
  listClasses,
  ListItemIcon,
  listItemIconClasses,
  MenuItem,
  paperClasses,
  Stack,
  Typography,
  Avatar, // Added Avatar for initials
} from '@mui/material';
import Menu from '@mui/material/Menu';
import IconifyIcon from 'components/base/IconifyIcon';
import StatusAvatar from 'components/base/StatusAvatar';
import { useSettingsContext } from 'providers/SettingsProvider';
import { useState } from 'react';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import paths, { authPaths } from 'routes/paths';

import { useERPUser } from 'providers/ERPUserProvider';
import { ERP_CONFIG } from 'lib/erpApi';
import { redirectToLogin } from '@/lib/apigate';

const ProfileMenu = ({ type = 'default' }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { up } = useBreakpoints();
  const upSm = up('sm');
  const {
    config: { textDirection },
  } = useSettingsContext();

  const { user, displayName, displayEmail, loading } = useERPUser();

  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const nameLabel = loading ? 'Loading...' : (displayName || 'Guest');
  const emailLabel = loading ? '' : (displayEmail || '');
  // Use image if available, otherwise just use initials
  const userImage = user?.user_image ? `${ERP_CONFIG.baseUrl}${user.user_image}` : undefined;
  const initial = (nameLabel.charAt(0) || '?').toUpperCase();

  const menuButton = (
    <Button
      color="neutral"
      variant="text"
      shape="circle"
      onClick={handleClick}
      sx={[
        {
          height: 44,
          width: 44,
        },
        type === 'slim' && {
          height: 30,
          width: 30,
          minWidth: 30,
        },
      ]}
    >
      <StatusAvatar
        alt={nameLabel}
        status="online" // Kept green dot as requested
        src={userImage} // Will use image if exists, otherwise uses the child (initial)
        sx={[
          {
            width: 40,
            height: 40,
            border: 2,
            borderColor: 'background.paper',
            bgcolor: 'primary.main', // Background color if no image
            color: 'primary.contrastText',
          },
          type === 'slim' && { width: 24, height: 24, border: 1, borderColor: 'background.paper' },
        ]}
      >
        {!userImage && initial}
      </StatusAvatar>
    </Button>
  );

  return (
    <>
      {type === 'slim' && upSm ? (
        <Button color="neutral" variant="text" size="small" onClick={handleClick}>
          {nameLabel}
        </Button>
      ) : (
        menuButton
      )}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        transformOrigin={{
          horizontal: textDirection === 'rtl' ? 'left' : 'right',
          vertical: 'top',
        }}
        anchorOrigin={{
          horizontal: textDirection === 'rtl' ? 'left' : 'right',
          vertical: 'bottom',
        }}
        sx={{
          [`& .${paperClasses.root}`]: { minWidth: 320 },
          [`& .${listClasses.root}`]: { py: 0 },
        }}
      >
        <Stack
          sx={{
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 2,
          }}
        >
          <StatusAvatar
            status="online"
            alt={nameLabel}
            src={userImage}
            sx={{ width: 48, height: 48, bgcolor: 'primary.main', color: 'primary.contrastText' }}
          >
            {!userImage && initial}
          </StatusAvatar>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                mb: 0.5,
              }}
            >
              {nameLabel}
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                color: 'warning.main',
              }}
            >
              {emailLabel}
            </Typography>
          </Box>
        </Stack>

        <Divider />

        <Box sx={{ py: 1 }}>
          {/* Changed to Roles and Permissions */}
          <ProfileMenuItem icon="material-symbols:shield-person-outline-rounded" onClick={handleClose}>
            Roles and Permissions
          </ProfileMenuItem>

          {/* Changed to Go to ERPNext and opens in new tab */}
          <ProfileMenuItem
            icon="material-symbols:open-in-new-rounded"
            onClick={handleClose}
            href="https://cityqerp.ortusolis.in/app"
            target="_blank" // Opens in new tab
          >
            Go to ERPNext
          </ProfileMenuItem>
        </Box>

        <Divider />

        <Box sx={{ py: 1 }}>
          <ProfileMenuItem
            icon="material-symbols:manage-accounts-outline-rounded"
            onClick={handleClose}
            href="#!"
          >
            Account Settings
          </ProfileMenuItem>
          <ProfileMenuItem
            icon="material-symbols:question-mark-rounded"
            onClick={handleClose}
            href="#!"
          >
            Help Center
          </ProfileMenuItem>
        </Box>

        <Divider />

        <Box sx={{ py: 1 }}>
          {/* Made Log Out button RED */}
          <ProfileMenuItem
            onClick={() => {
              handleClose();
              redirectToLogin();
            }}
            icon="material-symbols:logout-rounded"
            sx={{ color: 'error.main' }}
            iconColor="error.main"
          >
            Sign Out
          </ProfileMenuItem>
        </Box>
      </Menu>
    </>
  );
};

// Updated helper component to allow passing custom icon colors and target attributes
const ProfileMenuItem = ({ icon, onClick, children, href, target, sx, iconColor = 'text.secondary' }) => {
  const linkProps = href ? { component: Link, href, target, underline: 'none' } : {};

  return (
    <MenuItem onClick={onClick} {...linkProps} sx={{ gap: 1, ...sx }}>
      <ListItemIcon
        sx={{
          [`&.${listItemIconClasses.root}`]: { minWidth: 'unset !important' },
        }}
      >
        <IconifyIcon icon={icon} sx={{ color: iconColor }} />
      </ListItemIcon>
      {children}
    </MenuItem>
  );
};

export default ProfileMenu;