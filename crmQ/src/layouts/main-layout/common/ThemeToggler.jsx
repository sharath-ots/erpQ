'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  Menu,
  Stack,
  Tooltip,
  Typography,
  keyframes,
  listItemButtonClasses,
} from '@mui/material';
import { cssVarRgba } from 'lib/utils';
import IconifyIcon from 'components/base/IconifyIcon';
import ThemeList from 'components/settings-panel/theme-preset/ThemeList';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const THEME_TOOLTIP_KEY = 'theme-tooltip-shown';

const START_TIME = 2000;
const CLOSE_TIME = 10000;

const sizeMap = {
  default: { box: 39, radius: 7.5, ringInset: 1 },
  slim: {
    box: 32,
    radius: 7.25,
    ringInset: 0.85,
  },
};

const ThemeToggler = ({ type = 'default' } = {}) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const spinAnimation = `${spin} 4s linear infinite`;
  const sizes = sizeMap[type];

  const handleClick = useCallback(
    (event) => {
      if (searchParams.size > 0) {
        router.replace(pathname);
      }
      setAnchorEl(event.currentTarget);
    },
    [searchParams, router, pathname],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const getIcon = () => {
    return `material-symbols${type === 'slim' ? '' : '-light'}:palette-outline`;
  };

  useEffect(() => {
    const hasShown = sessionStorage.getItem(THEME_TOOLTIP_KEY);
    if (hasShown) return;

    let countdownInterval;

    const startTimer = setTimeout(() => {
      setShowTooltip(true);
      setRemainingTime(Math.floor(CLOSE_TIME / 1000));

      countdownInterval = window.setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, START_TIME);
    const closeTimer = setTimeout(() => {
      setShowTooltip(false);
      setRemainingTime(0);
      sessionStorage.setItem(THEME_TOOLTIP_KEY, 'true');
      if (countdownInterval) clearInterval(countdownInterval);
    }, START_TIME + CLOSE_TIME);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(closeTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [START_TIME, CLOSE_TIME]);

  return (
    <Fragment>
      <Box
        sx={{
          position: 'relative',
          width: sizes.box,
          height: sizes.box,

          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: sizes.radius,
            zIndex: 2,
            ...(type === 'slim'
              ? {
                  background: ({ vars }) =>
                    `conic-gradient(from 0deg, ${vars.palette.secondary.main}, ${cssVarRgba(vars.palette.secondary.mainChannel, 0.1)}, ${vars.palette.secondary.main})`,
                  animation: spinAnimation,
                }
              : {
                  background: ({ vars }) =>
                    `linear-gradient(to bottom, ${vars.palette.secondary.main},
          ${(cssVarRgba(vars.palette.secondary.mainChannel, 0.01), 'transparent')})`,
                  animation: spinAnimation,
                }),
          },

          '&::after': {
            content: '""',
            position: 'absolute',
            inset: sizes.ringInset,
            borderRadius: sizes.radius,
            zIndex: type === 'slim' ? 3 : 1,
            background: ({ vars }) =>
              type === 'slim' ? vars.palette.background.paper : vars.palette.secondary.light,
          },
        }}
      >
        <Tooltip
          open={showTooltip}
          title={
            <Stack direction="column" gap={1}>
              <Stack gap={0.5} sx={{ alignItems: 'center' }}>
                <Typography variant="body2">Explore color themes</Typography>
                <Chip variant="filled" label="New" color="warning" size="xsmall" />
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                This message closes in {remainingTime}s
              </Typography>
            </Stack>
          }
          placement="bottom"
          arrow
          disableHoverListener
          disableFocusListener
          disableTouchListener
          slotProps={{
            tooltip: {
              sx: {
                width: 'max-content',
              },
            },
            popper: {
              disablePortal: true,
            },
          }}
        >
          <Button
            shape="circle"
            color="neutral"
            variant={type === 'default' ? 'soft' : 'text'}
            onClick={handleClick}
            size={type === 'slim' ? 'small' : 'medium'}
            sx={[
              {
                position: 'absolute',
                zIndex: 10,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                ...(type === 'slim' && {
                  backgroundColor: ({ vars }) => vars.palette.background.paper,
                  '&:hover': {
                    backgroundColor: ({ vars }) => vars.palette.background.paper,
                  },
                }),
              },
            ]}
          >
            <IconifyIcon
              icon={getIcon()}
              sx={{
                fontSize: type === 'slim' ? 18 : 22,
                position: 'relative',
                zIndex: 5,
              }}
            />
          </Button>
        </Tooltip>
      </Box>

      <Menu
        keepMounted
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 288,
            },
          },
        }}
      >
        <Box sx={{ [`& .${listItemButtonClasses.root}`]: { borderRadius: 0 } }}>
          <ThemeList variant="menu" />
        </Box>
      </Menu>
    </Fragment>
  );
};

export default ThemeToggler;
