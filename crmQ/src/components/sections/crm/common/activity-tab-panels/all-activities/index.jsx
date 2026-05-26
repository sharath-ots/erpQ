'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import IconifyIcon from 'components/base/IconifyIcon';
import SimpleBar from 'components/base/SimpleBar';
import StyledTextField from 'components/styled/StyledTextField';
import Activity from './Activity';

dayjs.extend(isToday);

const AllActivitiesTabPanel = ({ referenceId, referenceType }) => {
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!referenceId) return;
      setLoading(true);
      try {
        // 🚀 DYNAMICALLY HIT THE RIGHT API
        const endpoint = referenceType === 'Opportunity' 
          ? `/api/opportunity/opportunity-activity?opportunity_id=${referenceId}`
          : `/api/lead-activity?lead_id=${referenceId}`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch activities');
        
        const rawData = await res.json();
        const groupedMap = {};

        rawData.forEach(item => {
          const dateKey = dayjs(item.timestamp).format('YYYY-MM-DD');
          if (!groupedMap[dateKey]) groupedMap[dateKey] = { id: dateKey, date: item.timestamp, activities: [] };

          const cleanContent = item.content ? item.content.replace(/<[^>]*>?/gm, '').trim() : '';
          let titleStr = cleanContent || 'Added a note';
          let typeStr = 'note', colorStr = 'warning', iconStr = 'material-symbols:edit-note-outline-rounded';

          if (item.type === 'edit') { titleStr = 'Edited the record'; typeStr = 'edit'; colorStr = 'info'; iconStr = 'material-symbols:edit-document-outline-rounded'; }
          else if (item.commentType === 'Assigned') { titleStr = cleanContent || 'Assigned the record'; typeStr = 'task'; colorStr = 'success'; iconStr = 'material-symbols:assignment-ind-outline-rounded'; }
          else if (item.commentType === 'Attachment') { titleStr = `attached ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'primary'; iconStr = 'material-symbols:attach-file-rounded'; }
          else if (item.commentType === 'Attachment Removed') { titleStr = `removed attachment ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'error'; iconStr = 'material-symbols:delete-outline-rounded'; }
          else if (item.commentType === 'Info') { titleStr = cleanContent || 'System Update'; typeStr = 'note'; colorStr = 'primary'; iconStr = 'material-symbols:info-outline-rounded'; }

          groupedMap[dateKey].activities.push({ id: item.id, type: typeStr, title: titleStr, color: colorStr, user: item.author || 'System', icon: iconStr, timeStamp: item.timestamp });
        });

        const formattedActivities = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllActivities(formattedActivities);
      } catch (error) {
        console.error("Error loading activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [referenceId, referenceType]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  if (allActivities.length === 0) {
    return <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No recent activity found.</Typography></Box>;
  }

  return (
    <Container maxWidth={false} sx={{ maxWidth: 800, px: { xs: 0 } }}>
      <StyledTextField
        placeholder="Search an activity"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <IconifyIcon icon="material-symbols:search" sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ maxWidth: 300, mt: 1, mb: 3 }}
      />
      <SimpleBar sx={{ maxHeight: 504 }}>
        <Stack direction="column" gap={3}>
          {allActivities.map(({ id, date, activities }) => {
            const activityDate = dayjs(date);
            const isTodayDate = activityDate.isToday();
            const formattedDate = activityDate.format('D MMM, YYYY');

            return (
              <Stack key={id} direction="column" gap={1}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    position: 'sticky', top: 0, zIndex: 2, py: 1, px: 2,
                    bgcolor: 'background.paper', fontWeight: isTodayDate ? 500 : 700,
                    color: isTodayDate ? 'text.secondary' : 'inherit',
                  }}
                >
                  {isTodayDate ? (
                    <><Box component="strong" sx={{ color: 'text.primary' }}>Today</Box> ({formattedDate})</>
                  ) : (formattedDate)}
                </Typography>
                <Stack direction="column" gap={1}>
                  {activities.map((activity) => (
                    <Activity key={activity.id} activity={activity} />
                  ))}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </SimpleBar>
    </Container>
  );
};

export default AllActivitiesTabPanel;