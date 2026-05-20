'use client';

import { createContext, useReducer, use, useCallback, useState } from 'react';
import { kanbanBoard } from '../data/kanban/kanban/kanban';
import { DRAG_START, DRAG_OVER, DRAG_END } from '../reducers/KanbanReducer';
import { kanbanReducer } from '../reducers/KanbanReducer';
import dayjs from 'dayjs'; // 🚀 Added to calculate today/tomorrow automatically

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

    // 🚀 THE FIX: Intercept the drag end, calculate dates, and update ERPNext!
    const handleDragEnd = (event) => {
        const { active, over } = event;

        // 1. Execute the physical UI move immediately for a smooth animation
        kanbanDispatch({
            type: DRAG_END,
            payload: { activeId: active?.id, overId: over?.id },
        });

        if (!active || !over) return;

        // 2. Find the exact task we just dragged using the CURRENT state
        let movedTask = null;
        for (const list of state.listItems) {
            const found = list.tasks.find(t => t.id === active.id);
            if (found) {
                movedTask = found;
                break;
            }
        }

        // 3. Determine the destination list ID (it could be hovering over a list OR another task)
        let destListId = over.id;
        for (const list of state.listItems) {
            if (list.id === over.id || list.tasks.some(t => t.id === over.id)) {
                destListId = list.id;
                break;
            }
        }

        // 4. Calculate the new dates and update ERPNext
        if (movedTask && movedTask.erp_ids && movedTask.erp_ids.length > 0) {
            const today = dayjs().format('YYYY-MM-DD');
            const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

            const updatedFields = {};

            // Map the destination columns to dates
            if (destListId === 'list2') { 
                // Moved to "Today"
                //updatedFields.dueDate = today;
                updatedFields.followUpDate = today;
            } else if (destListId === 'list3') { 
                // Moved to "Tomorrow"
                //updatedFields.dueDate = tomorrow;
                updatedFields.followUpDate = tomorrow;
            } else if (destListId === 'list4') { 
                // Moved to "Urgent"
                updatedFields.priority = 'urgent';
            }

            // Only fire updates if it actually landed in a column that changes its values
            if (Object.keys(updatedFields).length > 0) {
                
                // A. Dispatch EDIT_TASK so the card's Date Chip & properties update visually instantly
                kanbanDispatch({
                    type: 'EDIT_TASK', 
                    payload: { ...movedTask, ...updatedFields }
                });

                // B. Silently save to ERPNext in the background
                fetch('/api/frappe/todo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        erp_ids: movedTask.erp_ids,
                        ...updatedFields,
                        follow_up_date: updatedFields.followUpDate // Map to snake_case for backend
                    })
                }).catch(err => console.error("Failed to sync drag update to ERPNext:", err));
            }
        }
    };

    return (
        <KanbanContext
            value={{ ...state, handleDragStart, handleDragOver, handleDragEnd, kanbanDispatch, activeFilters, setActiveFilters, searchQuery, setSearchQuery }}
        >
            {children}
        </KanbanContext>
    );
};

export const useKanbanContext = () => use(KanbanContext);

export default KanbanProvider;