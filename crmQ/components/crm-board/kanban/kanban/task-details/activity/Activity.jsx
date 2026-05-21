import { useEffect, useState } from 'react';
import { Timeline, timelineItemClasses } from '@mui/lab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useKanbanContext } from '../../../../../../providers/KanbanProvider';
import ActivityItem from './ActivityItem';
import dayjs from 'dayjs';

const Activity = () => {
  const { taskDetails } = useKanbanContext();
  const [groupedActivities, setGroupedActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchId = taskDetails?.erp_ids?.[0];

  useEffect(() => {
    if (!fetchId) return;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/frappe/activities?docname=${fetchId}`);
        const result = await res.json();
        
        if (!result.data) throw new Error("No data returned");

        // Format dates
        const formatted = result.data.map(log => ({
            id: log.id,
            icon: log.icon,
            title: log.title,
            time: dayjs(log.creation).format('hh:mm A'),
            date: dayjs(log.creation).format('DD MMM, YYYY')
        }));

        // 🚀 THE FIX: Group by Date to restore the UI lines!
        const groups = [];
        formatted.forEach(item => {
            let group = groups.find(g => g.date === item.date);
            if (!group) {
                group = { id: item.date, date: item.date, items: [] };
                groups.push(group);
            }
            group.items.push(item);
        });

        setGroupedActivities(groups);
      } catch (e) {
        console.error("Activity fetch error", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivity();
  }, [fetchId]);

  return (
    <Paper sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Activity
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress size={24}/></Box>
      ) : (
        <Timeline
          sx={{ p: 0, m: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 } }}
        >
          {groupedActivities.map((activityGroup, groupIndex) => (
            <Box
              key={activityGroup.id}
              sx={{ pb: (groupedActivities.length - 1 !== groupIndex) ? 2 : 0 }}
            >
              {/* Date Header */}
              <Typography variant="subtitle1" sx={{ pb: 2, fontWeight: 600 }}>
                {activityGroup.date}
              </Typography>
              
              {/* Timeline Items */}
              {activityGroup.items.map((item, itemIndex) => (
                <ActivityItem
                  key={item.id}
                  data={item}
                  isLastItem={itemIndex === activityGroup.items.length - 1}
                />
              ))}
            </Box>
          ))}
        </Timeline>
      )}
    </Paper>
  );
};

export default Activity;