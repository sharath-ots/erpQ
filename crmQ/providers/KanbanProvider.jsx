'use client';

import { createContext, useReducer, use, useCallback, useState } from 'react';
import { kanbanBoard } from '../data/kanban/kanban/kanban';
import { DRAG_START, DRAG_OVER, DRAG_END } from '../reducers/KanbanReducer';
import { kanbanReducer } from '../reducers/KanbanReducer';
import dayjs from 'dayjs';

const initialState = {
    kanbanBoard: kanbanBoard,
    listItems: kanbanBoard.listItems,
    draggedList: null,
    draggedTask: null,
    taskDetails: null,
};

export const KanbanContext = createContext({});

const KanbanProvider = ({ children }) => {
    const [state, kanbanDispatch] = useReducer(kanbanReducer, initialState);

    const [activeFilters, setActiveFilters] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');

    // 🚀 THE FIX: Added Cache-Busting so Next.js never serves stale data!
    const silentCardRefresh = async (erpRawId) => {
        try {
            // 1. Force the browser/server to fetch fresh data, bypassing all caches
            const res = await fetch(`/api/frappe/todo?_t=${Date.now()}`, {
                cache: 'no-store'
            });
            const data = await res.json();
            const todos = Array.isArray(data.data || data) ? (data.data || data) : [];

            // 2. Find the specific updated task
            const freshTodo = todos.find(t => t.name === erpRawId);
            
            if (freshTodo) {
                const cardLabel = (freshTodo.reference_type || 'todo').toLowerCase();
                const cardTitle = freshTodo.reference_name || (freshTodo.description ? freshTodo.description.split('\n')[0] : 'Untitled Task');
                
                const formattedCard = {
                    id: `todo-${freshTodo.name}`,
                    erp_raw_id: freshTodo.name,
                    erp_ids: [freshTodo.name],
                    title: cardTitle,
                    label: cardLabel,
                    dueDate: freshTodo.date || 'No Date',
                    followUpDate: freshTodo.follow_up_date || null,
                    priority: (freshTodo.priority || 'medium').toLowerCase(),
                    description: freshTodo.description || '',
                    assignedBy: freshTodo.assigned_by || 'Unknown',
                    completed: freshTodo.status === "Closed",
                    attachments: [], 
                    subtasks: [], 
                    activities: [], 
                    attachmentCount: 0,
                    assignee: freshTodo.allocated_to ? [{ 
                        id: freshTodo.allocated_to, 
                        name: freshTodo.allocated_to.split('@')[0], 
                        avatarSeed: freshTodo.allocated_to 
                    }] : [],
                    // 🚀 3. Added progress data so TaskCard doesn't throw a visual error
                    progress: { 
                        total: 100, 
                        completed: cardLabel === 'task' ? 0 : 100, 
                        showBar: cardLabel === 'task' 
                    }
                };

                // Force the UI to accept the fresh, perfect data
                kanbanDispatch({ type: 'EDIT_TASK', payload: formattedCard });
            } else {
                console.warn(`Card ${erpRawId} not found in fresh data yet.`);
            }
        } catch (error) {
            console.error("Silent refresh failed:", error);
        }
    };

    const handleDragStart = (event) => {
        kanbanDispatch({
            type: DRAG_START,
            payload: { type: event.active.data.current?.type, item: event.active.data.current },
        });
    };

    const handleDragOver = useCallback(
        (() => {
            let timeoutId;

            return (event) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    kanbanDispatch({
                        type: DRAG_OVER,
                        payload: {
                            activeId: event.active.id,
                            overId: event.over.id,
                            activeRect: event.active.rect.current.translated,
                            overRect: event.over.rect,
                        },
                    });
                }, 16);
            };
        })(),
        [],
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!active || !over) return;

        // 1. Find the active task and the exact list it belongs to
        let sourceList = null;
        let taskIndex = -1;
        for (let i = 0; i < state.listItems.length; i++) {
            taskIndex = state.listItems[i].tasks.findIndex(t => t.id === active.id);
            if (taskIndex !== -1) {
                sourceList = state.listItems[i];
                break;
            }
        }

        if (!sourceList || taskIndex === -1) return;
        const movedTask = sourceList.tasks[taskIndex];

        // 2. Find the destination list
        let destListId = over.id;
        for (const list of state.listItems) {
            if (list.id === over.id || list.tasks.some(t => t.id === over.id)) {
                destListId = list.id; break;
            }
        }

        // 3. Calculate new dates
        const today = dayjs().format('YYYY-MM-DD');
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD'); 

        let newFollowUpDate = movedTask.followUpDate;

        if (destListId === 'list1') newFollowUpDate = yesterday;
        else if (destListId === 'list2') newFollowUpDate = today;
        else if (destListId === 'list3') newFollowUpDate = tomorrow;

        // 4. 🚀 THE FIX: Break the React.memo cache!
        if (newFollowUpDate && newFollowUpDate !== movedTask.followUpDate) {
             
             // Create a BRAND NEW object reference. 
             // When the reducer moves this, TaskCard will see a new object and instantly re-render!
             sourceList.tasks[taskIndex] = {
                 ...movedTask,
                 followUpDate: newFollowUpDate
             };

             // Silently save to ERPNext in the background
             fetch('/api/frappe/todo', {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     erp_ids: movedTask.erp_ids,
                     follow_up_date: newFollowUpDate 
                 })
             }).catch(err => console.error("Failed to sync drag update:", err));
        }

        // 5. Physically move the card. It now carries the new object reference with it!
        kanbanDispatch({
            type: DRAG_END,
            payload: { activeId: active.id, overId: over.id },
        });
    };

    return (
        <KanbanContext
            value={{ ...state, handleDragStart, handleDragOver, handleDragEnd, kanbanDispatch, activeFilters, setActiveFilters, searchQuery, setSearchQuery, silentCardRefresh }}
        >
            {children}
        </KanbanContext>
    );
};

export const useKanbanContext = () => use(KanbanContext);

export default KanbanProvider;