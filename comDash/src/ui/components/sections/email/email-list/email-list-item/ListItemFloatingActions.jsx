import { usePathname } from 'next/navigation';
import { ButtonBase, IconButton, Stack, Tooltip } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import {
  ARCHIVE_EMAIL,
  DELETE_EMAIL,
  SNOOZE_EMAIL,
  UPDATE_MESSAGE_STATUS,
} from 'reducers/EmailReducer';
import IconifyIcon from 'components/base/IconifyIcon';

const ListItemFloatingActions = ({ email }) => {
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  // 🚀 FIXED: Smarter Path Parsing
  // If URL is /m/emailq/email/list/inbox -> label is "inbox"
  // If URL is /m/emailq/email/details/inbox/123 -> label is "inbox"
  const extractedId = pathParts[pathParts.length - 1];
  const extractedLabel = pathname.includes('/details/')
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1];

  const params = {
    id: extractedId,
    label: extractedLabel || 'inbox'
  };

  const context = useEmailContext() || {};
  const emailDispatch = context.emailDispatch;
  const resizableWidth = context.resizableWidth || 0;

  const preventDefaultBehaviour = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!emailDispatch) return null; // Safety check

  return (
    <Stack
      className="actions"
      onClick={preventDefaultBehaviour}
      onMouseDown={preventDefaultBehaviour}
      direction="row"
      sx={[
        {
          alignItems: 'center',
          bgcolor: 'action.hover',
          position: 'absolute',
          right: 16,
          height: 1,
          pl: 2,
          opacity: 0,
          display: { xs: 'none', sm: 'flex' },
        },
        params.id !== 'email' &&
        resizableWidth < 500 && {
          height: 'auto',
          top: 16,
        },
      ]}
    >
      <Tooltip title="Delete">
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() => emailDispatch({ type: DELETE_EMAIL, payload: [email.id] })}
          disabled={params.label === 'trash'}
          sx={{
            fontSize: 20,
            color: params.label === 'trash' ? 'text.disabled' : 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <IconifyIcon icon="material-symbols:delete-outline-rounded" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Archive">
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() => emailDispatch({ type: ARCHIVE_EMAIL, payload: [email.id] })}
          // 🚀 FIXED: Changed 'label' to 'params.label'
          disabled={params.label === 'trash' || params.label === 'archived'}
          sx={[
            {
              fontSize: 20,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            },
            // 🚀 FIXED: Changed 'label' to 'params.label'
            (params.label === 'trash' || params.label === 'archived') && { color: 'text.disabled' },
          ]}
        >
          <IconifyIcon icon="material-symbols:archive-outline-rounded" />
        </IconButton>
      </Tooltip>

      <Tooltip title={email.snoozedTill === null ? 'Snooze for 1 day' : 'Unsnooze'}>
        <IconButton
          size="small"
          onClick={() => emailDispatch({ type: SNOOZE_EMAIL, payload: { ids: [email.id] } })}
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <IconifyIcon icon="material-symbols:snooze-outline-rounded" />
        </IconButton>
      </Tooltip>

      <Tooltip title={email.readAt === null ? 'Mark as read' : 'Mark as unread'}>
        <IconButton
          size="small"
          onClick={() =>
            emailDispatch({ type: UPDATE_MESSAGE_STATUS, payload: { ids: [email.id] } })
          }
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <IconifyIcon
            icon={
              email.readAt === null
                ? 'material-symbols:mark-email-read-outline-rounded'
                : 'material-symbols:mark-email-unread-outline'
            }
          />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default ListItemFloatingActions;