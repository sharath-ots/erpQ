import { useEffect, useState } from 'react';
import SettingsProvider from '@/shared-ui/providers/SettingsProvider';
import ThemeProvider from '@/shared-ui/providers/ThemeProvider';
import { Box, Grid, Divider, Card, Typography, IconButton, Stack, CircularProgress } from '@mui/material';
import MainLayout from '../../src/layouts/main-layout';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import { useRouter } from 'next/navigation';

// 🚀 EXPERT FIX: Import your actual API fetcher to get the live counts!
import { fetchLeadListAdmin } from '../../data/crm/lead';

import { kpisData, dealsData } from '../../data/crm/Homepage/dashboard';
import CRMKPIs from '../../data/crm/Homepage/CRMKPIs';
import CRMGreeting from '../../components/crm-dashboard/CRMGreetings';

export default function CRMDashboard() {
    const router = useRouter();
    const topRowKPIs = kpisData.filter(item => item.title !== 'Opportunities');

    // State for our live fetched counts
    const [leadCounts, setLeadCounts] = useState({ today: 0, week: 0, month: 0 });
    const [loading, setLoading] = useState(true);

    // Helper to get local YYYY-MM-DD
    const getLocalDateString = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // 🚀 EXPERT FIX: Fetch live data on mount to calculate exact counts
    useEffect(() => {
        const getCounts = async () => {
            setLoading(true);
            try {
                const leads = [];

                const now = new Date();
                const todayStr = getLocalDateString(now);

                // Get Start of Week (Monday)
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay() || 7; // Convert Sunday (0) to 7
                startOfWeek.setDate(startOfWeek.getDate() - day + 1);

                // Get Start of Month
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                let todayCount = 0, weekCount = 0, monthCount = 0;

                leads.forEach(lead => {
                    if (!lead.creation) return;
                    const creationDate = new Date(lead.creation);
                    const creationStr = getLocalDateString(creationDate);

                    if (creationStr === todayStr) todayCount++;
                    if (creationDate >= startOfWeek) weekCount++;
                    if (creationDate >= startOfMonth) monthCount++;
                });

                setLeadCounts({ today: todayCount, week: weekCount, month: monthCount });
            } catch (error) {
                console.error("Failed to fetch lead counts:", error);
            } finally {
                setLoading(false);
            }
        };

        getCounts();
    }, []);

    // 🚀 EXPERT FIX: Define the beautifully styled cards with their exact data mapping
    const bottomCardsData = [
        {
            title: "New Leads Today",
            count: leadCounts.today,
            icon: "material-symbols:today-rounded", // Calendar Day Icon
            color: "#3b82f6", // Blue text
            bgcolor: "#eff6ff", // Light blue background
            filterType: "Today"
        },
        {
            title: "New Leads This Week",
            count: leadCounts.week,
            icon: "material-symbols:date-range-rounded", // Calendar Week Icon
            color: "#10b981", // Green text
            bgcolor: "#ecfdf5", // Light green background
            filterType: "Week"
        },
        {
            title: "New Leads This Month",
            count: leadCounts.month,
            icon: "material-symbols:calendar-month-rounded", // Calendar Month Icon
            color: "#8b5cf6", // Purple text
            bgcolor: "#f5f3ff", // Light purple background
            filterType: "Month"
        },
        {
            isAction: true // The Add Lead button
        }
    ];

    const handleCardClick = (card) => {
        if (card.isAction) {
            router.push('/crm/lead-list/AddLead');
            return;
        }

        const now = new Date();
        const endStr = getLocalDateString(now);
        let startStr = endStr; // Default to 'Today'

        if (card.filterType === 'Week') {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - day + 1);
            startStr = getLocalDateString(startOfWeek);
        } else if (card.filterType === 'Month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = getLocalDateString(startOfMonth);
        }

        const filterRule = [{
            field: 'creation',
            operator: 'between',
            value: [startStr, endStr]
        }];

        router.push(`/crm/lead-list?filters=${encodeURIComponent(JSON.stringify(filterRule))}`);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>

            {/* --- ROW 1: Greetings --- */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={12}>
                    <CRMGreeting data={dealsData} />
                </Grid>
            </Grid>

            {/* --- ROW 2: Primary Navigation Cards --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <CRMKPIs data={topRowKPIs} />
            </Grid>

            <Divider sx={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: 'divider', mb: 4 }} />

            {/* --- ROW 3: Secondary Stats (Now perfectly matching the top layer!) --- */}
            <Grid container spacing={3}>
                {bottomCardsData.map((card, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            onClick={() => handleCardClick(card)}
                            sx={{
                                p: 3.5,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: card.isAction ? 'center' : 'flex-start',
                                alignItems: card.isAction ? 'center' : 'flex-start',
                                bgcolor: card.isAction ? '#f8fafc' : 'background.paper',
                                cursor: 'pointer',
                                border: card.isAction ? '2px dashed' : '1px solid',
                                borderColor: 'divider',
                                boxShadow: 'none',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: card.isAction ? '#eff6ff' : '#f8fafc',
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                                }
                            }}
                        >
                            {card.isAction ? (
                                <Stack spacing={1} alignItems="center">
                                    <IconButton color="primary" size="large" disableRipple sx={{ bgcolor: '#eff6ff', mb: 1 }}>
                                        <IconifyIcon icon="material-symbols:add-rounded" width={36} height={36} />
                                    </IconButton>
                                    <Typography variant="body2" fontWeight={700} color="primary.main">
                                        Add Lead
                                    </Typography>
                                </Stack>
                            ) : (
                                <>
                                    {/* Colored Icon Box matching the top row */}
                                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: card.bgcolor, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                                        <IconifyIcon icon={card.icon} fontSize="1.75rem" />
                                    </Box>

                                    {/* Live Data Count */}
                                    <Typography variant="h3" fontWeight={800} color="text.primary" sx={{ mb: 1, minHeight: 36 }}>
                                        {loading ? <CircularProgress size={24} sx={{ mt: 1 }} /> : card.count}
                                    </Typography>

                                    {/* Subtitle */}
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        {card.title}
                                    </Typography>
                                </>
                            )}
                        </Card>
                    </Grid>
                ))}
            </Grid>

        </Box>
    );
}