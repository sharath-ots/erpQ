export const boards = ['Lead Pipeline', 'Marketing', 'Sales'];
export const taskLabels = ['task', 'event', 'lead', 'todo'];
export const taskPriorities = ['high', 'medium', 'low'];

// --- UI CONSTANTS ---
const description_fallback = `A Kanban Board follow-up...`;

// --- 1. THE BOARD STRUCTURE ---
export const kanbanBoard = {
  id: 1,
  name: 'Lead Pipeline',
  assignee: [], // 🚀 Cleaned out dummy user data
  backgroundOption: { type: 'color', background: '#f4f7fe' },
  listItems: [
    { id: 'list1', title: 'Overdue', tasks: [] },
    { id: 'list2', title: 'Today', tasks: [] },
    { id: 'list3', title: 'Tomorrow', tasks: [] },
    // { id: 'list4', title: 'Urgent', tasks: [] },
    // { id: 'list5', title: 'Rework / Backlog', tasks: [] },
  ],
};

// --- 2. THE MAPPING FUNCTION ---
const createCardFromToDo = (todo) => {
  const assignedEmail = todo.allocated_to;
  const cleanName = assignedEmail ? assignedEmail.split('@')[0].replace('.', ' ') : 'Unknown User';
  
  const realAssignees = assignedEmail ? [{
    id: assignedEmail,
    name: cleanName,
    avatarSeed: assignedEmail 
  }] : [];

  // 🚀 CATEGORIZATION LOGIC
  let cardLabel = 'todo';
  if (todo.reference_type === 'Task') cardLabel = 'task';
  else if (todo.reference_type === 'Event') cardLabel = 'event';
  else if (todo.reference_type === 'Lead') cardLabel = 'lead';

  // 🚀 TITLE LOGIC
  // If it has a reference name (like "CRM-LEAD-001"), use it. Otherwise, use the first line of the description.
  const firstLineOfDesc = todo.description ? todo.description.split('\n')[0] : null;
  const cardTitle = todo.reference_name || firstLineOfDesc || 'Untitled Task';

  return {
    id: `todo-${todo.name || Math.random()}`,
    erp_raw_id: todo.name, 
    
    label: cardLabel, 
    title: cardTitle,
    dueDate: todo.date || 'No Date',
    followUpDate: todo.follow_up_date || null,
    assignee: realAssignees,
    
    referenceType: todo.reference_type || null,
    referenceName: todo.reference_name || null,
    completed: todo.status === "Closed",
    priority: (todo.priority || 'medium').toLowerCase(),
    description: todo.description || description_fallback,
    assignedBy: todo.assigned_by || 'Unknown',
    
    // Default UI Arrays
    attachments: [],
    subtasks: [],
    activities: [],
    
    // Dynamic Progress Bar: Show for tasks, hide for general ToDos
    progress: { 
        total: 100, 
        completed: cardLabel === 'task' ? 0 : 100, 
        showBar: cardLabel === 'task' 
    }
  };
};

// --- 3. THE AUTO-FETCH & MUTATE ---
if (typeof window !== 'undefined') {
  (async () => {
    try {
      // 🚀 FETCH FROM TODO ENDPOINT
      const res = await fetch('/api/frappe/todo'); 
      const data = await res.json();
      const todos = Array.isArray(data.data || data) ? (data.data || data) : [];

      const todayObj = new Date();
      const today = todayObj.toISOString().split('T')[0];
      
      const tomorrowObj = new Date(todayObj);
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrow = tomorrowObj.toISOString().split('T')[0];

      kanbanBoard.listItems.forEach(list => list.tasks = []);

      // 🚀 GROUP DUPLICATES TOGETHER
      const groupedCardsMap = new Map();

      todos.forEach(todo => {
        // Skip closed tasks so the board stays clean
        if (todo.status === 'Closed') return; 

        const card = createCardFromToDo(todo);
        const uniqueKey = `${card.title}-${card.dueDate}-${card.referenceName || 'manual'}`;

        if (groupedCardsMap.has(uniqueKey)) {
          const existingCard = groupedCardsMap.get(uniqueKey);
          
          const mergedAssignees = [...existingCard.assignee, ...card.assignee];
          const uniqueAssignees = [];
          const seenIds = new Set();
          for (const a of mergedAssignees) {
            if (a && a.id && !seenIds.has(a.id)) {
              seenIds.add(a.id);
              uniqueAssignees.push(a);
            }
          }
          existingCard.assignee = uniqueAssignees;

          if (!existingCard.erp_ids) {
              existingCard.erp_ids = existingCard.erp_raw_id ? [existingCard.erp_raw_id] : [];
          }
          if (card.erp_raw_id && !existingCard.erp_ids.includes(card.erp_raw_id)) {
              existingCard.erp_ids.push(card.erp_raw_id);
          }

        } else {
          card.erp_ids = card.erp_raw_id ? [card.erp_raw_id] : [];
          groupedCardsMap.set(uniqueKey, card);
        }
      });

      const consolidatedCards = Array.from(groupedCardsMap.values());

      // 🚀 SORT INTO COLUMNS BY DATE AND PRIORITY
      consolidatedCards.forEach(card => {
        if (card.followUpDate < today) {
          kanbanBoard.listItems[0].tasks.push(card);
        } else if (card.followUpDate === today) {
          kanbanBoard.listItems[1].tasks.push(card);
        } else if (card.followUpDate === tomorrow) {
          kanbanBoard.listItems[2].tasks.push(card);
        }
      });

    } catch (e) {
      console.error("Kanban Fetch Error:", e);
    }
  })();
}