'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Checkbox, IconButton, Stack, Tooltip } from '@mui/material';
import { useBulkSelect } from 'providers/BulkSelectProvider';
import { useEmailContext } from 'providers/EmailProvider';
import { IMPORTANT_EMAIL, STARRED_EMAIL } from 'reducers/EmailReducer';
import IconifyIcon from 'components/base/IconifyIcon';
import CardHeaderAction from 'components/common/CardHeaderAction';

const EmailListItemActions = ({ email }) => {
  const { selectedIds, handleToggleCheck } = useBulkSelect();
  const { emailDispatch, resizableWidth } = useEmailContext();
  const { id } = useParams();

  const [isStarred, setIsStarred] = useState(email.starred);
  const [isImportant, setIsImportant] = useState(email.important);

  useEffect(() => {
    setIsStarred(email.starred);
    setIsImportant(email.important);
  }, [email.starred, email.important]);

  const preventDefaultBehaviour = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleStatus = async (type, dbField, currentValue) => {
    const newValue = !currentValue;

    if (type === STARRED_EMAIL) setIsStarred(newValue);
    if (type === IMPORTANT_EMAIL) setIsImportant(newValue);

    if (emailDispatch) {
      emailDispatch({
        type: type,
        payload: { ids: [email.id], [type === STARRED_EMAIL ? 'starred' : 'important']: newValue },
      });
    }

    try {
      await fetch('/api/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id, field: dbField, value: newValue ? 1 : 0 })
      });
    } catch (err) {
      console.error("Failed to save to database", err);
      if (type === STARRED_EMAIL) setIsStarred(currentValue);
      if (type === IMPORTANT_EMAIL) setIsImportant(currentValue);
    }
  };

  return (
    <CardHeaderAction sx={{ mx: '-6px', mr: 0 }}>
      <Stack sx={[{ mr: 2, alignItems: 'center', mb: 1 }, (!id || resizableWidth > 500) && { mb: 0 }]}>
        <Tooltip title="Select">
          <Checkbox
            size="small"
            checked={selectedIds.includes(email.id)}
            onChange={() => handleToggleCheck(email.id)}
            // 🚀 FIX: Removed preventDefault! We only stop propagation so the email doesn't open.
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{ p: 0.9 }}
          />
        </Tooltip>

        <Tooltip title={isStarred ? 'Starred' : 'Not Starred'}>
          <IconButton
            size="small"
            onClick={(e) => {
              toggleStatus(STARRED_EMAIL, 'custom_starred', isStarred);
              preventDefaultBehaviour(e);
            }}
            onMouseDown={preventDefaultBehaviour}
          >
            <IconifyIcon
              icon={isStarred ? 'material-symbols:star-rate-rounded' : 'material-symbols:star-rate-outline-rounded'}
              sx={{ fontSize: 20, color: isStarred ? 'warning.main' : 'text.primary' }}
            />
          </IconButton>
        </Tooltip>

        <Tooltip title={isImportant ? 'Important' : 'Not Important'}>
          <IconButton
            size="small"
            onClick={(e) => {
              toggleStatus(IMPORTANT_EMAIL, 'custom_important', isImportant);
              preventDefaultBehaviour(e);
            }}
            onMouseDown={preventDefaultBehaviour}
          >
            <IconifyIcon
              icon={isImportant ? 'material-symbols:label-important-rounded' : 'material-symbols:label-important-outline-rounded'}
              sx={{ fontSize: 20, color: isImportant ? 'warning.main' : 'text.primary' }}
            />
          </IconButton>
        </Tooltip>
      </Stack>
    </CardHeaderAction>
  );
};

export default EmailListItemActions;