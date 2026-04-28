'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Card, Typography, IconButton, Stack, CircularProgress } from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';

import { fetchLeadListAdmin } from '../../data/crm/lead';

const LeadSummaryCards = () => {
    const router = useRouter();
    const [leadCounts, setLeadCounts] = useState({ today: 0, week: 0, month: 0 });
    const [loading, setLoading] = useState(true);

    const getLocalDateString = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    useEffect(() => {
        const getCounts = async () => {
            setLoading(true);
            try {
                const leads = await fetchLeadListAdmin() || [];

                const now = new Date();
                const todayStr = getLocalDateString(now);

                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay() || 7;
                startOfWeek.setDate(startOfWeek.getDate() - day + 1);

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

    const bottomCardsData = [
        {
            title: "New Leads Today", count: leadCounts.today,
            icon: "material-symbols:today-rounded", color: "#3b82f6", bgcolor: "#eff6ff", filterType: "Today"
        },
        {
            title: "New Leads This Week", count: leadCounts.week,
            icon: "material-symbols:date-range-rounded", color: "#10b981", bgcolor: "#ecfdf5", filterType: "Week"
        },
        {
            title: "New Leads This Month", count: leadCounts.month,
            icon: "material-symbols:calendar-month-rounded", color: "#8b5cf6", bgcolor: "#f5f3ff", filterType: "Month"
        },
        { isAction: true }
    ];

    const handleCardClick = (card) => {
        if (card.isAction) {
            router.push('/m/crmq/lead-list/AddLead');
            return;
        }

        const now = new Date();
        const endStr = getLocalDateString(now);
        let startStr = endStr;

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
            field: 'creation', operator: 'between', value: [startStr, endStr]
        }];

        router.push(`/m/crmq/lead-list?filters=${encodeURIComponent(JSON.stringify(filterRule))}`);
    };

    return (
        // 🚀 EXPERT FIX: Using the "1px gap" trick to create perfect seamless borders
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
            width: '100%',
            // This is the magic: The background color peeks through the 1px gap!
            bgcolor: 'divider',
            gap: '1px',
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
        }}>
            {bottomCardsData.map((card, index) => (
                <Card
                    key={index}
                    square // 👈 Removes border radius so it sits perfectly flush
                    onClick={() => handleCardClick(card)}
                    sx={{
                        p: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: card.isAction ? 'center' : 'flex-start',
                        alignItems: card.isAction ? 'center' : 'flex-start',
                        bgcolor: card.isAction ? '#f8fafc' : 'background.paper',
                        cursor: 'pointer',
                        border: 'none', // 👈 Handled by the parent gap trick now
                        boxShadow: 'none',
                        transition: 'all 0.2s ease-in-out',
                        position: 'relative', // Helps z-index work on hover
                        '&:hover': {
                            bgcolor: card.isAction ? '#eff6ff' : '#f8fafc',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                            zIndex: 1 // Pops the card over its neighbors when hovered
                        }
                    }}
                >
                    {card.isAction ? (
                        <Stack spacing={1.5} alignItems="center">
                            <IconButton color="primary" size="large" disableRipple sx={{ bgcolor: '#eff6ff' }}>
                                <IconifyIcon icon="material-symbols:add-rounded" width={32} height={32} />
                            </IconButton>
                            <Typography variant="body1" fontWeight={600} color="primary.main">
                                Add Lead
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            <Box sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                bgcolor: card.bgcolor,
                                color: card.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 3
                            }}>
                                <IconifyIcon icon={card.icon} fontSize="1.5rem" />
                            </Box>

                            <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1, minHeight: 36 }}>
                                {loading ? <CircularProgress size={24} sx={{ mt: 1 }} /> : card.count}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {card.title}
                            </Typography>
                        </>
                    )}
                </Card>
            ))}
        </Box>
    );
};

export default LeadSummaryCards;