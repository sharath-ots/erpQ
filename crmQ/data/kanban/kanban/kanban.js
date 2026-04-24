import { initialConfig } from 'config';
import { users } from 'data/users';

const image = (index) => `${initialConfig.assetsDir}/images/kanban/task/${index}.webp`;

// --- UI CONSTANTS ---
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

// --- 1. THE BOARD STRUCTURE ---
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

// --- 2. THE MAPPING FUNCTION ---
const createCard = (activity, lead, type) => ({
  id: `${lead.name}-${type}-${activity.name || Math.random()}`,
  label: type, // 'task', 'event', or 'email'
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

// --- 3. THE AUTO-FETCH & MUTATE ---
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const res = await fetch('/api/lead');
      const data = await res.json();
      const leads = Array.isArray(data) ? data : [];
      const today = new Date().toISOString().split('T')[0];

      // Clear existing dummy tasks
      kanbanBoard.listItems.forEach(list => list.tasks = []);

      leads.forEach(lead => {
        let cards = [];

        // Extract Tasks (handles both single objects and arrays)
        if (lead.task_info) {
          const tasks = Array.isArray(lead.task_info) ? lead.task_info : [lead.task_info];
          tasks.forEach(t => cards.push(createCard(t, lead, 'task')));
        }

        // Extract Events
        if (lead.event_info) {
          const events = Array.isArray(lead.event_info) ? lead.event_info : [lead.event_info];
          events.forEach(e => cards.push(createCard(e, lead, 'event')));
        }

        // Default Lead Card if no specific activities
        if (cards.length === 0) cards.push(createCard({}, lead, 'email'));

        // Sort into columns
        cards.forEach(card => {
          if (card.priority === 'urgent') {
            kanbanBoard.listItems[3].tasks.push(card); // Urgent
          } else if (lead.status === 'Rework') {
            kanbanBoard.listItems[4].tasks.push(card); // Rework
          } else if (card.dueDate < today) {
            kanbanBoard.listItems[0].tasks.push(card); // Overdue
          } else if (card.dueDate === today) {
            kanbanBoard.listItems[1].tasks.push(card); // Today
          } else {
            kanbanBoard.listItems[2].tasks.push(card); // Tomorrow
          }
        });
      });

    } catch (e) {
      console.error("CRM Fetch Error:", e);
    }
  })();
}