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
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// 1. Import our custom session hook
import { useERPUser } from 'providers/ERPUserProvider';
// 2. Import ERP config to dynamically get the base URL
import { ERP_CONFIG } from 'lib/erpApi';

const ProfileMenu = ({ type = 'default' }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const { up } = useBreakpoints();
  const upSm = up('sm');
  const {
    config: { textDirection },
  } = useSettingsContext();

  const { data } = useSession();

  // 3. Grab the user data from our session
  const { user, loading } = useERPUser();

  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 4. Calculate dynamic display values based on session
  const displayName = loading ? 'Loading...' : (user?.first_name || user?.full_name || 'Guest');
  const displayEmail = loading ? 'Loading...' : (user?.email || 'user@example.com');
  // Use image if available, otherwise just use initials
  const userImage = user?.user_image ? `${ERP_CONFIG.baseUrl}${user.user_image}` : undefined;
  const initial = displayName.charAt(0).toUpperCase();

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
        alt={displayName}
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
          {displayName}
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
            alt={displayName}
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
              {user?.full_name} {/* Changed from Guest to User Name */}
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                color: 'warning.main',
              }}
            >
              {displayEmail} {/* Changed from Merchant Captain to Email */}
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

        <Divider />

        <Box sx={{ py: 1 }}>
          <ProfileMenuItem
            onClick={async () => {
              const loginUrl = process.env.NEXT_PUBLIC_AUTH_URL || '';

              const res = await signOut({
                redirect: false,
                callbackUrl: loginUrl,
              });

              if (res.url) {
                router.push(res.url);
              }
            }}
            icon="material-symbols:logout-rounded"
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