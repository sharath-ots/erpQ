'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ButtonBase, Checkbox, Divider, IconButton, Stack, Tooltip } from '@mui/material';
import { useBulkSelect } from 'providers/BulkSelectProvider';
import { useEmailContext } from 'providers/EmailProvider';
import {
  ARCHIVE_EMAIL,
  DELETE_EMAIL,
  IMPORTANT_EMAIL,
  SNOOZE_EMAIL,
  STARRED_EMAIL,
} from 'reducers/EmailReducer';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailListActionMenu from './EmailListActionMenu';

const EmailListActions = () => {
  const { handleToggleAll, isIndeterminate, isAllSelected, selectedIds, clearSelection } = useBulkSelect();
  const { emailState, emailDispatch } = useEmailContext();

  const [localEmails, setLocalEmails] = useState([]);

  useEffect(() => {
    const sourceData = emailState?.emails?.length > 0 ? emailState.emails : (emailState?.initialEmails || []);
    setLocalEmails(sourceData);
  }, [emailState?.emails, emailState?.initialEmails]);

  useEffect(() => {
    const handleSync = (e) => {
      const { ids, field, value } = e.detail;
      setLocalEmails((prev) => prev.map((email) => ids.includes(email.id) ? { ...email, [field]: value } : email));
    };
    window.addEventListener('APP_BULK_EMAIL_UPDATE', handleSync);
    return () => window.removeEventListener('APP_BULK_EMAIL_UPDATE', handleSync);
  }, []);

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const label = pathParts.includes('list') ? pathParts[pathParts.length - 1] : 'inbox';

  const starred = useMemo(() => {
    return localEmails.filter((email) => selectedIds.includes(email.id)).every((email) => email.starred) && selectedIds.length > 0;
  }, [localEmails, selectedIds]);

  const important = useMemo(() => {
    return localEmails.filter((email) => selectedIds.includes(email.id)).every((email) => email.important) && selectedIds.length > 0;
  }, [localEmails, selectedIds]);

  const handleBulkToggle = async (type, dbField, isCurrentlyActive) => {
    if (selectedIds.length === 0) return;

    const idsToUpdate = [...selectedIds];
    const newValue = !isCurrentlyActive;

    window.dispatchEvent(new CustomEvent('APP_BULK_EMAIL_UPDATE', {
      detail: { ids: idsToUpdate, field: type === STARRED_EMAIL ? 'starred' : 'important', value: newValue }
    }));

    if (emailDispatch) {
      emailDispatch({
        type: type,
        payload: { ids: idsToUpdate, [type === STARRED_EMAIL ? 'starred' : 'important']: newValue },
      });
    }

    handleToggleAll(false);

    try {
      for (const id of idsToUpdate) {
        await fetch('/api/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, field: dbField, value: newValue ? 1 : 0 })
        });
      }
    } catch (err) {
      console.error(`Bulk ${dbField} update failed:`, err);
    }
  };

  useEffect(() => {
    handleToggleAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  return (
    <Stack direction="row" alignItems="center">
      <Tooltip title="Select">
        <Checkbox
          sx={{ p: '7px' }}
          onChange={(e) => handleToggleAll(e.target.checked)}
          checked={isAllSelected}
          indeterminate={isIndeterminate ? true : undefined}
        />
      </Tooltip>
      <Tooltip title={starred ? 'Remove star from selected' : 'Star selected'}>
        <IconButton
          component={ButtonBase}
          size="small"
          onClick={() => handleBulkToggle(STARRED_EMAIL, 'custom_starred', starred)}
          disabled={!selectedIds.length}
        >
          <IconifyIcon
            icon={starred ? 'material-symbols:star-rate-rounded' : 'material-symbols:star-rate-outline-rounded'}
            sx={[{ fontSize: 20, color: 'text.primary' }, starred && { color: 'warning.main' }, !selectedIds.length && { color: 'text.disabled' }]}
          />
        </IconButton>
      </Tooltip>
      <Tooltip title={important ? 'Remove important from selected' : 'Mark selected as important'}>
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() => handleBulkToggle(IMPORTANT_EMAIL, 'custom_important', important)}
          disabled={!selectedIds.length}
        >
          <IconifyIcon
            icon={important ? 'material-symbols:label-important-rounded' : 'material-symbols:label-important-outline-rounded'}
            sx={[{ fontSize: 20, color: 'text.primary' }, important && { color: 'warning.main' }, !selectedIds.length && { color: 'text.disabled' }]}
          />
        </IconButton>
      </Tooltip>
      {/* <Tooltip title={snoozed ? 'Unsnooze' : 'Snooze for 1 day'}>
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() =>
            emailDispatch({
              type: SNOOZE_EMAIL,
              payload: { ids: selectedIds, snoozed: !snoozed },
            })
          }
          disabled={!selectedIds.length}
        >
          <IconifyIcon
            icon="material-symbols:snooze-outline-rounded"
            sx={{
              fontSize: 20,
              color: !selectedIds.length ? 'text.disabled' : 'text.primary',
            }}
          />
        </IconButton>
      </Tooltip>
      <Tooltip title="Archive">
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() => emailDispatch({ type: ARCHIVE_EMAIL, payload: selectedIds })}
          disabled={!selectedIds.length}
          sx={[(label === 'trash' || label === 'archived') && { display: 'none' }]}
        >
          <IconifyIcon
            icon="material-symbols:archive-outline-rounded"
            sx={{
              fontSize: 20,
              color: !selectedIds.length ? 'text.disabled' : 'text.primary',
            }}
          />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          component={ButtonBase}
          onClick={() => emailDispatch({ type: DELETE_EMAIL, payload: selectedIds })}
          disabled={!selectedIds.length}
          sx={[label === 'trash' && { display: 'none' }]}
        >
          <IconifyIcon
            icon="material-symbols:delete-outline-rounded"
            sx={{
              fontSize: 20,
              color: !selectedIds.length ? 'text.disabled' : 'text.primary',
            }}
          />
        </IconButton>
      </Tooltip> */}
      {/* <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 2 }} />
      <EmailListActionMenu /> */}
    </Stack>
  );
};

export default EmailListActions;
