'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  listItemTextClasses,
  Typography,
} from '@mui/material';
import { emailCategory } from 'data/email';
import { useEmailContext } from 'providers/EmailProvider';
import paths from 'routes/paths';
import IconifyIcon from 'components/base/IconifyIcon';

const EmailSidebarPanel = ({ toggleDrawer }) => {
  const context = useEmailContext();
  const { initialEmails = [] } = context?.emailState || {};

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  // 🚀 Robust Label Detection
  const currentLabel = pathname.includes('/details/')
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  const unreadMailCount = useMemo(
    () => initialEmails.filter((email) => email.folder === 'inbox' && email.readAt === null).length,
    [initialEmails],
  );

  const draftMailCount = useMemo(
    () => initialEmails.filter((email) => email.folder === 'draft').length,
    [initialEmails],
  );

  return (
    <List sx={{ p: 0 }}>
      {emailCategory.map((item) => {
        const itemLabel = item.title.toLowerCase();
        const isActive = currentLabel === itemLabel;

        return (
          <ListItemButton
            key={item.title}
            component={Link}
            underline="none"
            // 🚀 Matches your ERP-Q dashboard routing
            href={`/m/emailq/email/list/${itemLabel}`}
            onClick={toggleDrawer}
            sx={{ py: 0.5, mb: '2px' }}
          >
            <ListItemIcon>
              <IconifyIcon
                icon={item.icon}
                sx={{
                  fontSize: 14,
                  color: isActive ? 'primary.dark' : 'text.primary',
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              sx={{
                [`& .${listItemTextClasses.primary}`]: {
                  typography: 'caption',
                  fontWeight: isActive ? 'bold' : 'medium',
                  color: isActive ? 'primary.dark' : 'text.primary',
                },
              }}
            />
            {item.title === 'Inbox' && unreadMailCount > 0 && (
              <Typography color="warning.dark" sx={{ fontSize: '10px', fontWeight: 700 }}>
                {unreadMailCount}
              </Typography>
            )}
            {item.title === 'Draft' && draftMailCount > 0 && (
              <Typography color="info.dark" sx={{ fontSize: '10px', fontWeight: 500 }}>
                {draftMailCount}
              </Typography>
            )}
          </ListItemButton>
        );
      })}
    </List>
  );
};

export default EmailSidebarPanel;