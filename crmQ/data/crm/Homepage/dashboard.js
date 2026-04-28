export const kpisData = [
    {
        title: 'Leads',
        value: 57, // You can replace this with a dynamic variable later
        subtitle: 'View all open leads',
        path: '/m/crmq/list/Lead',
        icon: {
            name: 'material-symbols:leaderboard-outline-rounded',
            color: 'primary.main',
        },
    },
    {
        title: 'Kanban Board',
        value: 'Board',
        subtitle: 'Coming Soon',
        path: '#',
        icon: {
            name: 'material-symbols:view-kanban-outline-rounded',
            color: 'info.main',
        },
    },
    {
        title: 'Opportunities',
        value: 0,
        subtitle: 'View all opportunities',
        path: '/m/crmq/list/Opportunity',
        icon: {
            name: 'material-symbols:lightbulb-outline-rounded',
            color: 'warning.main',
        },
    },
    {
        title: 'Dashboard',
        value: 'Stats',
        subtitle: 'Coming Soon',
        path: '#',
        icon: {
            name: 'material-symbols:dashboard-outline-rounded',
            color: 'success.main',
        },
    },
];

export const dealsData = [
    {
        icon: 'material-symbols:handshake-outline-rounded',
        count: 310,
        label: 'Leads created',
        percentage: 4.3,
        trend: 'up',
    },
    {
        icon: 'material-symbols:payments-outline-rounded',
        count: 26,
        label: 'Leads closed',
        percentage: 1.9,
        trend: 'down',
    },
];

export const saleFunnelTableData = [
    { stageIndicator: 'chBlue.100', stage: 'Awareness', lostLead: 32.2, thisMonth: 6.01 },
    { stageIndicator: 'chBlue.200', stage: 'Research', lostLead: 30.1, thisMonth: 4.12 },
    { stageIndicator: 'chBlue.300', stage: 'Intent', lostLead: 22.1, thisMonth: 3.91 },
    { stageIndicator: 'chBlue.400', stage: 'Evaluation', lostLead: 15.6, thisMonth: 0.01 },
    { stageIndicator: 'chBlue.500', stage: 'Negotiation', lostLead: 30.1, thisMonth: 4.12 },
    { stageIndicator: 'chGreen.500', stage: 'Acquisition', lostLead: 30.1, thisMonth: 4.12 },
];

// Add this to your data/crm/Homepage/dashboard.js file

export const newLeadsStatsData = [
    { title: 'New Leads Today', count: 12 },
    { title: 'New Leads this Week', count: 48 },
    { title: 'New Leads This Month', count: 156 },
    { title: 'Add New', isAction: true } // The "+" block
];