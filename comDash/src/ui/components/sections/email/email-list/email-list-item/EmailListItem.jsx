import { usePathname, useSearchParams } from 'next/navigation'; // 🚀 Added useSearchParams
import { Link, ListItem, ListItemButton, listItemButtonClasses } from '@mui/material';
import { cssVarRgba } from 'lib/utils';
import { useBulkSelect } from 'providers/BulkSelectProvider';
import { useEmailContext } from 'providers/EmailProvider';
import EmailListItemActions from './EmailListItemActions';
import EmailListItemContent from './EmailListItemContent';
import ListItemFloatingActions from './ListItemFloatingActions';

const EmailListItem = ({ mail }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // 🚀 Grab current search params
  const pathParts = pathname.split('/').filter(Boolean);

  let labelFromUrl = pathname.includes('/details/')
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  if (!labelFromUrl || labelFromUrl === 'undefined' || labelFromUrl === 'email') {
    labelFromUrl = 'inbox';
  }

  const folderToUse = mail.folder || labelFromUrl;
  const activeId = pathname.includes('/details/') ? pathParts[pathParts.length - 1] : null;

  const { resizableWidth } = useEmailContext();
  const { selectedIds } = useBulkSelect();

  // 🚀 Generate the suffix to preserve search state
  const currentSearch = searchParams.toString();
  const searchSuffix = currentSearch ? `?${currentSearch}` : '';

  return (
    <ListItem disablePadding>
      <ListItemButton
        component={Link}
        underline="none"
        // 🚀 Append the search context to the detail route!
        href={`/m/emailq/email/details/${folderToUse}/${mail.id}${searchSuffix}`}
        sx={[
          {
            bgcolor: (theme) =>
              selectedIds.includes(mail.id)
                ? cssVarRgba(theme.vars.palette.primary.lightChannel, 0.2)
                : 'transparent',
            py: 2,
            [`&.${listItemButtonClasses.selected}`]: {
              bgcolor: (theme) =>
                selectedIds.includes(mail.id)
                  ? cssVarRgba(theme.vars.palette.primary.lightChannel, 0.2)
                  : 'primary.lighter',
            },
            '&:hover': {
              '.actions': {
                opacity: 1,
                transition: ({ transitions }) =>
                  transitions.create(['opacity', 'background-color'], {
                    duration: transitions.duration.short,
                    easing: transitions.easing.easeIn,
                  }),
              },
              [`&.${listItemButtonClasses.selected}`]: {
                '.actions': {
                  bgcolor: 'primary.lighter',
                },
              },
            },
          },
          // Handle mobile/narrow widths
          activeId && resizableWidth < 500 && {
            display: 'block',
          },
        ]}
        selected={String(mail.id) === String(activeId)}
      >
        <EmailListItemActions email={mail} />
        <EmailListItemContent email={mail} />
        <ListItemFloatingActions email={mail} />
      </ListItemButton>
    </ListItem>
  );
};

export default EmailListItem;