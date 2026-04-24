'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Paper, Stack, Box, Typography, CircularProgress } from '@mui/material';
import { useNavContext } from 'layouts/main-layout/NavProvider';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import { useKanbanContext } from '../../../../providers/KanbanProvider';
import SimpleBar from 'components/base/SimpleBar';
import KanbanApp from './KanbanApp';
import KanbanHeader from './page-header/KanbanHeader';
import TaskDetails from './task-details/TaskDetails';
import { initialConfig } from 'config';
import { users } from 'data/users';

const image = (index) => `${initialConfig.assetsDir}/images/kanban/task/${index}.webp`;

const description_fallback = `A Kanban Board follow-up...`;
const attachments = [{ id: 1, image: image(0), filename: 'Silly_sight_1.png', time: '2024-12-21T12:56:00', addedBy: 'Sampro' }];
const subtasks = [
  { id: 1, title: 'Planning Phase', assignee: [], time: '2024-12-21T10:38:00', checked: false },
  { id: 2, title: 'Research and Validation', assignee: [users[2], users[5]], time: '2024-12-21T10:38:00', checked: false }
];
const activities = [{ id: 1, date: 'Today', items: [{ id: 1, title: 'Shared file', avatars: [...users.slice(2, 8)], icon: 'material-symbols:share-outline', time: '3:15 PM' }] }];

export const boards = ['Lead Pipeline', 'Marketing', 'Sales'];
export const taskLabels = ['task', 'event', 'email', 'undefined'];
export const taskPriorities = ['urgent', 'high', 'medium', 'low', 'optional'];

// 🚀 RESTORED: The blueprint for the board structure
export const kanbanBoard = {
  id: 1,
  name: 'Lead Pipeline',
  assignee: [...users.slice(2, 8)],
  backgroundOption: { type: 'color', background: '#f4f7fe' },
  listItems: [
    { id: 'list1', title: 'Overdue', tasks: [] },
    { id: 'list2', title: 'Today', tasks: [] },
    { id: 'list3', title: 'Tomorrow', tasks: [] },
    { id: 'list4', title: 'Urgent', tasks: [] },
    { id: 'list5', title: 'Rework', tasks: [] },
  ],
};

const createCard = (activity, lead, type) => ({
  id: `${lead.name}-${type}-${activity.name || Math.random()}`,
  label: type,
  title: activity.title || activity.subject || lead.lead_name || lead.name,
  dueDate: activity.date || (activity.starts_on ? activity.starts_on.split(' ')[0] : '2026-04-12'),
  assignee: [users[3], users[5]],
  completed: activity.status === "Completed" || activity.status === "Closed",
  priority: (activity.priority || lead.priority || 'medium').toLowerCase(),
  description: activity.description || lead.notes || description_fallback,
  attachments,
  subtasks,
  activities,
  progress: { total: 100, completed: type === 'event' ? 60 : 20, showBar: true }
});

const Kanban = () => {
  const { kanbanBoard: contextBoard, setKanbanBoard } = useKanbanContext();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/lead');
        const data = await res.json();

        const leads = Array.isArray(data) ? data : [];
        const todayStr = dayjs().format('YYYY-MM-DD');

        // 🚀 Create a fresh copy to avoid reference errors
        const newBoardData = JSON.parse(JSON.stringify(kanbanBoard));
        newBoardData.listItems.forEach(list => list.tasks = []);

        leads.forEach(lead => {
          let cards = [];

          // 1. Map Tasks
          if (lead.task_info && Array.isArray(lead.task_info)) {
            lead.task_info.forEach(t => {
              cards.push(createCard({ ...t, title: t.description, date: t.date }, lead, 'task'));
            });
          }

          // 2. Map Events
          if (lead.event_info && Array.isArray(lead.event_info)) {
            lead.event_info.forEach(e => {
              cards.push(createCard({ ...e, title: e.subject, date: e.starts_on }, lead, 'event'));
            });
          }

          // 3. Fallback to Email card if no tasks/events
          if (cards.length === 0) {
            cards.push(createCard({}, lead, 'email'));
          }

          // 4. Distribute into columns in our NEW object
          cards.forEach(card => {
            const cardDate = card.dueDate ? card.dueDate.split(' ')[0] : '';
            const isToday = dayjs(cardDate).isSame(todayStr, 'day');
            const isPast = dayjs(cardDate).isBefore(todayStr, 'day');

            if (card.priority === 'urgent') {
              newBoardData.listItems[3].tasks.push(card);
            } else if (lead.status === 'Rework') {
              newBoardData.listItems[4].tasks.push(card);
            } else if (isPast) {
              newBoardData.listItems[0].tasks.push(card);
            } else if (isToday) {
              newBoardData.listItems[1].tasks.push(card);
            } else {
              newBoardData.listItems[2].tasks.push(card);
            }
          });
        });

        // 🚀 Final step: Push the populated board into context
        if (setKanbanBoard) {
          setKanbanBoard(newBoardData);
        }
        setDataLoaded(true);

      } catch (e) {
        console.error("CRM Fetch Error:", e);
        setDataLoaded(true);
      }
    };

    if (contextBoard) fetchLeads();
  }, [contextBoard, setKanbanBoard]);

  return (
    <Paper elevation={0}>
      <KanbanHeader />
      <SimpleBar sx={{ height: 'calc(100vh - 200px)' }}>
        <Stack sx={{ gap: 3, px: 3, py: 2 }}>
          {!dataLoaded ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>
          ) : (
            <KanbanApp />
          )}
        </Stack>
      </SimpleBar>
      <TaskDetails />
    </Paper>
  );
};

export default Kanban;