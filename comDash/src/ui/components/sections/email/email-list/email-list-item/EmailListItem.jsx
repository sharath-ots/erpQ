import { usePathname } from 'next/navigation';
import { Link, ListItem, ListItemButton, listItemButtonClasses } from '@mui/material';
import { cssVarRgba } from 'lib/utils';
import { useBulkSelect } from 'providers/BulkSelectProvider';
import { useEmailContext } from 'providers/EmailProvider';
import paths from 'routes/paths';
import EmailListItemActions from './EmailListItemActions';
import EmailListItemContent from './EmailListItemContent';
import ListItemFloatingActions from './ListItemFloatingActions';

const EmailListItem = ({ mail }) => {
  // NEW LOGIC: Extract id and label from path
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  // Since the URL is /m/emailq/email/details/inbox/12345
  // We can pop() the last two items off the array to get our parameters.
  const extractedId = pathParts.pop();    // '12345'
  const extractedLabel = pathParts.pop(); // 'inbox'

  // We recreate the 'params' object so you don't have to rewrite the rest of your file!
  const params = {
    id: extractedId,
    label: extractedLabel
  };
  const { resizableWidth } = useEmailContext();
  const { selectedIds } = useBulkSelect();

  return (
    <ListItem disablePadding>
      <ListItemButton
        component={Link}
        underline="none"
        href={paths.emailDetails(params.label, String(mail.id))}
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
          !!params.id &&
          resizableWidth < 500 && {
            display: 'block',
          },
        ]}
        selected={mail.id === Number(params.id)}
      >
        <EmailListItemActions email={mail} />
        <EmailListItemContent email={mail} />
        <ListItemFloatingActions email={mail} />
      </ListItemButton>
    </ListItem>
  );
};

export default EmailListItem;
