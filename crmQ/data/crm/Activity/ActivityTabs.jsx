'use client';

import { useState, useEffect } from 'react';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import Tab from '@mui/material/Tab';
import Tabs, { tabsClasses } from '@mui/material/Tabs';
import { Box, CircularProgress, Typography } from '@mui/material';
import dayjs from 'dayjs'; // 🚀 Required to group activities by date

import AllActivitiesTabPanel from '@/shared-ui/components/sections/crm/common/activity-tab-panels/all-activities';
//import CallLogTabPanel from '@/shared-ui/components/sections/crm/common/activity-tab-panels/call-log';
import EmailTabPanel from '../../../components/ActivityTab/Email/index';
import MeetingTabPanel from '../../../components/ActivityTab/Meeting/index';
import NotesTabPanel from '../../../components/ActivityTab/notes/index';
import TaskTabPanel from '../../../components/ActivityTab/tasks/index';

import { activityMonitoringData } from './ActivityDetails';
// Add these to the top of ActivityTabs.jsx
import Email from '../../../components/email/Email';
import EmailLayout from '../../../src/layouts/email-layout/index';
import EmailDetails from '../../../components/email/EmailDetails';

const ActivityTab = { Activities: 'Activities', Email: 'Email', Meeting: 'Event', CallLog: 'Call log', Task: 'Task', Notes: 'Notes' };

export default function ActivityTabs({ leadId }) {
    const [activeTab, setActiveTab] = useState(ActivityTab.Activities);

    // Email State
    const [emails, setEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(false);

    // 🚀 NEW: Activity State
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    const handleChange = (_event, newValue) => setActiveTab(newValue);

    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!leadId) return;
            setLoadingTasks(true);
            try {
                const res = await fetch(`/api/lead-tasks?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();

                // 🚀 Group tasks: You can group by Status or just show one list
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

        if (activeTab === ActivityTab.Task && tasks.length === 0) {
            fetchTasks();
        }
    }, [activeTab, leadId]);

    // --- FETCH EMAILS ---
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

    useEffect(() => {
        const fetchActivities = async () => {
            if (!leadId) return;
            setLoadingActivities(true);

            try {
                // Calls the API route we created in the previous step
                const res = await fetch(`/api/lead-activity?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch activities");

                const rawData = await res.json();

                const groupedMap = {};

                rawData.forEach(item => {
                    const dateKey = dayjs(item.timestamp).format('YYYY-MM-DD');

                    if (!groupedMap[dateKey]) {
                        groupedMap[dateKey] = {
                            id: dateKey,
                            date: item.timestamp,
                            activities: []
                        };
                    }

                    // 1. Clean the raw HTML out of Frappe's content
                    const cleanContent = item.content ? item.content.replace(/<[^>]*>?/gm, '').trim() : '';

                    // 2. Setup default visuals (Standard Notes)
                    let titleStr = cleanContent || 'Added a note';
                    let typeStr = 'note';
                    let colorStr = 'warning';
                    let iconStr = 'material-symbols:edit-note-outline-rounded';

                    // 3. Customize based on specific Frappe event types
                    if (item.type === 'edit') {
                        titleStr = 'Edited the record';
                        typeStr = 'edit';
                        colorStr = 'info';
                        iconStr = 'material-symbols:edit-document-outline-rounded';

                    } else if (item.commentType === 'Assigned') {
                        titleStr = cleanContent || 'Assigned the record';
                        typeStr = 'task';
                        colorStr = 'success';
                        iconStr = 'material-symbols:assignment-ind-outline-rounded';

                    } else if (item.commentType === 'Attachment') {
                        // 🚀 FORMATS UPLOADS: "attached [Filename]"
                        titleStr = `attached ${cleanContent || 'a file'}`;
                        typeStr = 'attachment';
                        colorStr = 'primary';
                        iconStr = 'material-symbols:attach-file-rounded';

                    } else if (item.commentType === 'Attachment Removed') {
                        // 🚀 FORMATS DELETIONS: "removed attachment [Filename]"
                        titleStr = `removed attachment ${cleanContent || 'a file'}`;
                        typeStr = 'attachment';
                        colorStr = 'error'; // Red for deletions
                        iconStr = 'material-symbols:delete-outline-rounded';

                    } else if (item.commentType === 'Info') {
                        titleStr = cleanContent || 'System Update';
                        typeStr = 'note';
                        colorStr = 'primary';
                        iconStr = 'material-symbols:info-outline-rounded';
                    }

                    groupedMap[dateKey].activities.push({
                        id: item.id,
                        type: typeStr,
                        title: titleStr,
                        color: colorStr,
                        user: item.author || 'System',
                        icon: iconStr,
                        timeStamp: item.timestamp
                    });

                    // --- END OF UPDATED VISUALS BLOCK ---

                });

                // Convert grouped object back to an array and sort by newest dates first
                const formattedActivities = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));
                setActivities(formattedActivities);

            } catch (error) {
                console.error("Error loading activities:", error);
            } finally {
                setLoadingActivities(false);
            }
        };

        if (activeTab === ActivityTab.Activities && activities.length === 0) {
            fetchActivities();
        }
    }, [activeTab, leadId, activities.length]);

    // --- 🚀 NEW: FETCH EVENTS ---
    useEffect(() => {
        const fetchEvents = async () => {
            if (!leadId) return;
            setLoadingEvents(true);

            try {
                const res = await fetch(`/api/lead-events?lead_id=${leadId}`);
                if (!res.ok) throw new Error("Failed to fetch events");

                const rawData = await res.json();

                // 🎯 Group the Frappe events by Date to match your UI's expected format
                const groupedMap = {};

                rawData.forEach(item => {
                    // Extract just the YYYY-MM-DD for grouping
                    const dateKey = dayjs(item.starts_on).format('YYYY-MM-DD');

                    if (!groupedMap[dateKey]) {
                        groupedMap[dateKey] = {
                            id: dateKey,
                            date: item.starts_on,
                            meetings: [] // Your UI calls the array 'meetings'
                        };
                    }

                    groupedMap[dateKey].meetings.push({
                        id: item.name,
                        participant: item.subject || 'Event',
                        scheduledBy: item.owner,
                        scheduledDate: item.starts_on,
                        guests: [],
                        rawEventData: item // 🚀 NEW: Pass the ENTIRE Frappe object to the UI
                    });
                });

                // Convert grouped object back to an array and sort by newest dates first
                const formattedEvents = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));
                setEvents(formattedEvents);

            } catch (error) {
                console.error("Error loading events:", error);
            } finally {
                setLoadingEvents(false);
            }
        };

        // Trigger fetch when the Meeting/Event tab is clicked
        if (activeTab === ActivityTab.Meeting && events.length === 0) {
            fetchEvents();
        }
    }, [activeTab, leadId, events.length]);

    return (
        <TabContext value={activeTab}>
            <Tabs
                onChange={handleChange}
                value={activeTab}
                variant="scrollable"
                scrollButtons={true}
                allowScrollButtonsMobile
                sx={{
                    '& .MuiTabs-flexContainer': { justifyContent: 'center' },
                    [`& .${tabsClasses.root}`]: { scrollMarginTop: '0 !important', WebkitTapHighlightColor: 'transparent' },
                    [`& .${tabsClasses.scrollButtons}`]: { '&.Mui-disabled': { opacity: 0.3 } },
                }}
            >
                <Tab label={ActivityTab.Activities} value={ActivityTab.Activities} />
                <Tab label={ActivityTab.Email} value={ActivityTab.Email} />
                <Tab label={ActivityTab.Meeting} value={ActivityTab.Meeting} />
                {/* <Tab label={ActivityTab.CallLog} value={ActivityTab.CallLog} /> */}
                <Tab label={ActivityTab.Task} value={ActivityTab.Task} />
                <Tab label={ActivityTab.Notes} value={ActivityTab.Notes} />
            </Tabs>

            <TabPanel value={ActivityTab.Activities} sx={{ px: 0, pb: 0 }}>
                {loadingActivities ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : activities.length > 0 ? (
                    <AllActivitiesTabPanel allActivities={activities} />
                ) : (
                    <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1">No recent activity found.</Typography>
                    </Box>
                )}
            </TabPanel>

            {/* <TabPanel value={ActivityTab.Email} sx={{ px: 0, pb: 0 }}>
                {loadingEmails ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : emails.length > 0 ? (
                    <EmailTabPanel emailData={emails} />
                ) : (
                    <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1">No emails found for this Lead.</Typography>
                    </Box>
                )}
            </TabPanel> */}

            <TabPanel value={ActivityTab.Email} sx={{ px: 0, pb: 0, mt: 2 }}>
                <StandardEmailTabWrapper emailData={emails} />
            </TabPanel>

            <TabPanel value={ActivityTab.Meeting} sx={{ px: 0, pb: 0 }}>
                {loadingEvents ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        {/* 1. Show the "No events" text IF empty */}
                        {events.length === 0 && (
                            <Box sx={{ p: 5, pb: 2, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography variant="body1">No events scheduled for this Lead.</Typography>
                            </Box>
                        )}

                        {/* 2. ALWAYS render MeetingTabPanel so the "Add Event" button exists */}
                        <MeetingTabPanel
                            meetingData={events}
                            leadId={leadId}
                            onRefresh={() => {
                                // Clear the events to trigger a re-fetch in the useEffect
                                setEvents([]);
                            }}
                        />
                    </Box>
                )}
            </TabPanel>

            {/* <TabPanel value={ActivityTab.CallLog} sx={{ px: 0, pb: 0 }}><CallLogTabPanel callLogData={activityMonitoringData.callLog} /></TabPanel> */}
            <TabPanel value={ActivityTab.Task} sx={{ px: 0, pb: 0 }}>
                {loadingTasks ? <CircularProgress /> : <TaskTabPanel tasksData={tasks} leadId={leadId} />}
            </TabPanel>
            <TabPanel value={ActivityTab.Notes} sx={{ px: 0, pb: 0 }}><NotesTabPanel leadId={leadId} /></TabPanel>
        </TabContext>
    );
}

const StandardEmailTabWrapper = ({ emailData }) => {
    return (
        <Box
            sx={{
                // We lock the height so the layout doesn't collapse inside the tab
                height: { xs: 600, md: 700 },
                position: 'relative',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                // Force the layout to take up the full box
                '& > *': {
                    height: '100%'
                }
            }}
        >
            {/* We wrap Email in EmailLayout exactly like you did on the standalone page! */}
            <EmailLayout>
                <EmailDetails emailData={emailData} />
            </EmailLayout>
        </Box>
    );
};