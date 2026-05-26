'use client';
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import dayjs from 'dayjs';
import AllActivitiesTabPanel from '../../src/components/sections/crm/common/activity-tab-panels/all-activities';
import MeetingTabPanel from '../ActivityTab/Meeting/index';
import NotesTabPanel from '../ActivityTab/notes/index';
import TaskTabPanel from '../../components/ActivityTab/tasks/index';
import EmailLayout from '../../src/layouts/email-layout/index';
import EmailDetails from '../../components/email/EmailDetails';

const ActivityTab = { Activities: 'Activity', Email: 'Email', Meeting: 'Event', Task: 'Task', Notes: 'Notes' };

const StandardEmailTabWrapper = ({ emailData }) => (
    <Box sx={{ height: { xs: 'calc(100vh - 250px)', md: 700 }, minHeight: { xs: 500, md: 'auto' }, position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowY: 'hidden', overflowX: 'auto', '& > *': { height: '100%', minWidth: { xs: 'min-content', md: 'auto' } } }}>
        <EmailLayout><EmailDetails emailData={emailData} /></EmailLayout>
    </Box>
);

export default function OpportunityDetailPanels({ opportunityId, activeTab }) {
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [emails, setEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    useEffect(() => { setActivities([]); setEvents([]); setEmails([]); setTasks([]); }, [opportunityId]);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!opportunityId) return;
            setLoadingTasks(true);
            try {
                // 🚀 FIX: Changed to correct tasks endpoint
                const res = await fetch(`/api/opportunity/opportunity-tasks?opportunity_id=${opportunityId}`);
                if (!res.ok) throw new Error('Failed to fetch tasks');
                const rawData = await res.json();
                setTasks([{ id: 'all-tasks', title: 'Opportunity Tasks', taskList: rawData.map(t => ({ id: t.name, title: t.description ? t.description.replace(/<[^>]*>?/gm, '') : 'No Description', status: t.status, priority: t.priority, dueDate: t.date, allocated_to: t.allocated_to, completed: t.status === 'Closed', timeStamp: t.modified })) }]);
            } catch (e) { console.error('Task Fetch Error', e); } finally { setLoadingTasks(false); }
        };
        if (activeTab === ActivityTab.Task && tasks.length === 0) fetchTasks();
    }, [activeTab, opportunityId, tasks.length]);

    useEffect(() => {
        const fetchEmails = async () => {
            if (!opportunityId) return;
            setLoadingEmails(true);
            try {
                // 🚀 FIX: Changed to correct emails endpoint
                const res = await fetch(`/api/opportunity/opportunity-emails?opportunity_id=${opportunityId}`);
                if (!res.ok) throw new Error('Failed to fetch emails');
                setEmails(await res.json());
            } catch (error) { console.error('Error loading emails:', error); } finally { setLoadingEmails(false); }
        };
        if (activeTab === ActivityTab.Email && emails.length === 0) fetchEmails();
    }, [activeTab, opportunityId, emails.length]);

    useEffect(() => {
        const fetchActivities = async () => {
            if (!opportunityId) return;
            setLoadingActivities(true);
            try {
                const res = await fetch(`/api/opportunity/opportunity-activity?opportunity_id=${opportunityId}`);
                if (!res.ok) throw new Error('Failed to fetch activities');
                const rawData = await res.json();
                const groupedMap = {};
                rawData.forEach(item => {
                    const dateKey = dayjs(item.timestamp).format('YYYY-MM-DD');
                    if (!groupedMap[dateKey]) groupedMap[dateKey] = { id: dateKey, date: item.timestamp, activities: [] };
                    const cleanContent = item.content ? item.content.replace(/<[^>]*>?/gm, '').trim() : '';
                    let titleStr = cleanContent || 'Added a note', typeStr = 'note', colorStr = 'warning', iconStr = 'material-symbols:edit-note-outline-rounded';
                    if (item.type === 'edit') { titleStr = 'Edited the record'; typeStr = 'edit'; colorStr = 'info'; iconStr = 'material-symbols:edit-document-outline-rounded'; }
                    else if (item.commentType === 'Assigned') { titleStr = cleanContent || 'Assigned the record'; typeStr = 'task'; colorStr = 'success'; iconStr = 'material-symbols:assignment-ind-outline-rounded'; }
                    else if (item.commentType === 'Attachment') { titleStr = `attached ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'primary'; iconStr = 'material-symbols:attach-file-rounded'; }
                    else if (item.commentType === 'Attachment Removed') { titleStr = `removed attachment ${cleanContent || 'a file'}`; typeStr = 'attachment'; colorStr = 'error'; iconStr = 'material-symbols:delete-outline-rounded'; }
                    else if (item.commentType === 'Info') { titleStr = cleanContent || 'System Update'; typeStr = 'note'; colorStr = 'primary'; iconStr = 'material-symbols:info-outline-rounded'; }
                    groupedMap[dateKey].activities.push({ id: item.id, type: typeStr, title: titleStr, color: colorStr, user: item.author || 'System', icon: iconStr, timeStamp: item.timestamp });
                });
                setActivities(Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date)));
            } catch (error) { console.error('Error loading activities:', error); } finally { setLoadingActivities(false); }
        };
        if (activeTab === ActivityTab.Activities && activities.length === 0) fetchActivities();
    }, [activeTab, opportunityId, activities.length]);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!opportunityId) return;
            setLoadingEvents(true);
            try {
                const res = await fetch(`/api/opportunity/opportunity-events?opportunity_id=${opportunityId}`);
                if (!res.ok) throw new Error('Failed to fetch events');
                const rawData = await res.json();
                const groupedMap = {};
                rawData.forEach(item => {
                    const dateKey = dayjs(item.starts_on).format('YYYY-MM-DD');
                    if (!groupedMap[dateKey]) groupedMap[dateKey] = { id: dateKey, date: item.starts_on, meetings: [] };
                    groupedMap[dateKey].meetings.push({ id: item.name, participant: item.subject || 'Event', scheduledBy: item.owner, scheduledDate: item.starts_on, guests: [], rawEventData: item });
                });
                setEvents(Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date)));
            } catch (error) { console.error('Error loading events:', error); } finally { setLoadingEvents(false); }
        };
        if (activeTab === ActivityTab.Meeting && events.length === 0) fetchEvents();
    }, [activeTab, opportunityId, events.length]);

    if (activeTab === ActivityTab.Activities) return loadingActivities ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : activities.length > 0 ? <AllActivitiesTabPanel referenceId={opportunityId} referenceType="Opportunity" /> : <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No recent activity found.</Typography></Box>;
    if (activeTab === ActivityTab.Email) return loadingEmails ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : emails.length > 0 ? <StandardEmailTabWrapper emailData={emails} /> : <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No emails found for this Opportunity.</Typography></Box>;
    if (activeTab === ActivityTab.Meeting) return loadingEvents ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : <Box>{events.length === 0 && <Box sx={{ p: 5, pb: 2, textAlign: 'center', color: 'text.secondary' }}><Typography variant="body1">No events scheduled for this Opportunity.</Typography></Box>}<MeetingTabPanel meetingData={events} referenceId={opportunityId} referenceType="Opportunity" onRefresh={() => setEvents([])} /></Box>;
    if (activeTab === ActivityTab.Task) return loadingTasks ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : <TaskTabPanel tasksData={tasks} referenceId={opportunityId} referenceType="Opportunity" />;
    if (activeTab === ActivityTab.Notes) return <NotesTabPanel referenceId={opportunityId} referenceType="Opportunity" />;
    return null;
}