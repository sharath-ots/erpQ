'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import dayjs from 'dayjs';

// --- YOUR EXISTING IMPORTS ---
import AllActivitiesTabPanel from '@/shared-ui/components/sections/crm/common/activity-tab-panels/all-activities';
import MeetingTabPanel from './Meeting/index';
import NotesTabPanel from './notes/index';
import TaskTabPanel from '../../components/ActivityTab/tasks/index';
import { activityMonitoringData } from '../../data/crm/Activity/ActivityDetails';
import Email from '../email/Email';
import EmailLayout from '../../src/layouts/email-layout/index';
import EmailDetails from '../../components/email/EmailDetails';

// 🚀 Constant to match your Sidebar IDs
const ActivityTab = {
    Activities: 'Activity',
    Email: 'Email',
    Meeting: 'Event',
    Task: 'Task',
    Notes: 'Notes'
};

const StandardEmailTabWrapper = ({ emailData }) => {
    return (
        <Box sx={{ height: { xs: 600, md: 700 }, position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', '& > *': { height: '100%' } }}>
            <EmailLayout>
                <EmailDetails emailData={emailData} />
            </EmailLayout>
        </Box>
    );
};

export default function LeadDetailPanels({ leadId, activeTab }) {
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    const [emails, setEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // 🚀 EXPERT FIX 1: Wipe all cached data when leadId changes
    useEffect(() => {
        setActivities([]);
        setEvents([]);
        setEmails([]);
        setTasks([]);
    }, [leadId]);

    // --- 1. FETCH TASKS ---
    useEffect(() => {
        const fetchTasks = async () => {
            if (!leadId) return;
            setLoadingTasks(true);
            try {
                const res = await fetch(`/api/lead-tasks?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch tasks");
                const rawData = await res.json();
                console.log("Tasks Received from ERPNext:", rawData);

                const formatted = [{
                    id: 'all-tasks',
                    title: 'Lead Tasks',
                    taskList: rawData.map(t => ({
                        id: t.name,
                        title: t.description ? t.description.replace(/<[^>]*>?/gm, '') : 'No Description',
                        status: t.status,
                        priority: t.priority,
                        dueDate: t.date,
                        allocated_to: t.allocated_to,
                        completed: t.status === 'Closed',
                        timeStamp: t.modified
                    }))
                }];
                setTasks(formatted);
            } catch (e) {
                console.error("Task Fetch Error", e);
            } finally {
                setLoadingTasks(false);
            }
        };

        if (activeTab === ActivityTab.Task && tasks.length === 0) fetchTasks();
    }, [activeTab, leadId, tasks.length]);


    // --- 2. FETCH EMAILS ---
    useEffect(() => {
        const fetchEmails = async () => {
            if (!leadId) return;
            setLoadingEmails(true);
            try {
                const res = await fetch(`/api/lead-emails?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch emails");
                const rawData = await res.json();
                setEmails(rawData);
            } catch (error) {
                console.error("Error loading emails:", error);
            } finally {
                setLoadingEmails(false);
            }
        };

        if (activeTab === ActivityTab.Email && emails.length === 0) fetchEmails();
    }, [activeTab, leadId, emails.length]);


    // --- 3. FETCH ACTIVITIES ---
    useEffect(() => {
        const fetchActivities = async () => {
            if (!leadId) return;
            setLoadingActivities(true);
            try {
                const res = await fetch(`/api/lead-activity?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch activities");
                const rawData = await res.json();
                const groupedMap = {};

                rawData.forEach(item => {
                    const dateKey = dayjs(item.timestamp).format('YYYY-MM-DD');
                    if (!groupedMap[dateKey]) groupedMap[dateKey] = { id: dateKey, date: item.timestamp, activities: [] };

                    const cleanContent = item.content ? item.content.replace(/<[^>]*>?/gm, '').trim() : '';
                    let titleStr = cleanContent || 'Added a note';
                    let typeStr = 'note'; let colorStr = 'warning'; let iconStr = 'material-symbols:edit-note-outline-rounded';

                    if (item.type === 'edit') { titleStr = 'Edited the record'; typeStr = 'edit'; colorStr = 'info'; iconStr = 'material-symbols:edit-document-outline-rounded'; }
                    else if (item.commentType === 'Assigned') { titleStr = cleanContent || 'Assigned the record'; typeStr = 'task'; colorStr = 'success'; iconStr = 'material-symbols:assignment-ind-outline-rounded'; }
                    else if (item.commentType === 'Attachment') { titleStr = `attached ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'primary'; iconStr = 'material-symbols:attach-file-rounded'; }
                    else if (item.commentType === 'Attachment Removed') { titleStr = `removed attachment ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'error'; iconStr = 'material-symbols:delete-outline-rounded'; }
                    else if (item.commentType === 'Info') { titleStr = cleanContent || 'System Update'; typeStr = 'note'; colorStr = 'primary'; iconStr = 'material-symbols:info-outline-rounded'; }

                    groupedMap[dateKey].activities.push({ id: item.id, type: typeStr, title: titleStr, color: colorStr, user: item.author || 'System', icon: iconStr, timeStamp: item.timestamp });
                });

                const formattedActivities = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));
                setActivities(formattedActivities);
            } catch (error) {
                console.error("Error loading activities:", error);
            } finally {
                setLoadingActivities(false);
            }
        };

        if (activeTab === ActivityTab.Activities && activities.length === 0) fetchActivities();
    }, [activeTab, leadId, activities.length]);


    // --- 4. FETCH EVENTS ---
    useEffect(() => {
        const fetchEvents = async () => {
            if (!leadId) return;
            setLoadingEvents(true);
            try {
                const res = await fetch(`/api/lead-events?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch events");
                const rawData = await res.json();
                const groupedMap = {};

                rawData.forEach(item => {
                    const dateKey = dayjs(item.starts_on).format('YYYY-MM-DD');
                    if (!groupedMap[dateKey]) groupedMap[dateKey] = { id: dateKey, date: item.starts_on, meetings: [] };
                    groupedMap[dateKey].meetings.push({ id: item.name, participant: item.subject || 'Event', scheduledBy: item.owner, scheduledDate: item.starts_on, guests: [], rawEventData: item });
                });

                const formattedEvents = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));
                setEvents(formattedEvents);
            } catch (error) {
                console.error("Error loading events:", error);
            } finally {
                setLoadingEvents(false);
            }
        };

        if (activeTab === ActivityTab.Meeting && events.length === 0) fetchEvents();
    }, [activeTab, leadId, events.length]);


    // 🚀 FINAL RENDER LOGIC 🚀

    if (activeTab === ActivityTab.Activities) {
        return loadingActivities
            ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            : activities.length > 0
                ? <AllActivitiesTabPanel allActivities={activities} />
                : <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No recent activity found.</Typography></Box>;
    }

    if (activeTab === ActivityTab.Email) {
        return loadingEmails
            ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            : emails.length > 0
                ? <StandardEmailTabWrapper emailData={emails} />
                : <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No emails found for this Lead.</Typography></Box>;
    }

    if (activeTab === ActivityTab.Meeting) {
        return loadingEvents
            ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            : <Box>
                {events.length === 0 && <Box sx={{ p: 5, pb: 2, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No events scheduled for this Lead.</Typography></Box>}
                <MeetingTabPanel meetingData={events} leadId={leadId} onRefresh={() => setEvents([])} />
            </Box>;
    }

    if (activeTab === ActivityTab.Task) {
        return loadingTasks
            ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            : <TaskTabPanel tasksData={tasks} leadId={leadId} />;
    }

    if (activeTab === ActivityTab.Notes) {
        return <NotesTabPanel leadId={leadId} />;
    }

    return null;
}