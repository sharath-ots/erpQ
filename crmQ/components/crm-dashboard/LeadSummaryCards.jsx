'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Select, MenuItem, FormControl, Stack, Paper, Divider } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import { fetchLeadListAdmin } from '../../data/crm/lead';

const LeadSummaryCards = ({ timeFilter, setTimeFilter }) => {
    const router = useRouter();
    const [leadCounts, setLeadCounts] = useState({ total: 0, today: 0, week: 0, month: 0 });
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

                setLeadCounts({ total: leads.length, today: todayCount, week: weekCount, month: monthCount });
            } catch (error) {
                console.error("Failed to fetch lead counts:", error);
            } finally {
                setLoading(false);
            }
        };
        getCounts();
    }, []);

    const handleCardClick = (type) => {
        if (type === 'total') {
            router.push('/m/crmq/lead-list');
            return;
        }
        const now = new Date();
        const endStr = getLocalDateString(now);
        let startStr = endStr;

        if (timeFilter === 'week') {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - day + 1);
            startStr = getLocalDateString(startOfWeek);
        } else if (timeFilter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = getLocalDateString(startOfMonth);
        }

        const filterRule = [{ field: 'creation', operator: 'between', value: [startStr, endStr] }];
        router.push(`/m/crmq/lead-list?filters=${encodeURIComponent(JSON.stringify(filterRule))}`);
    };

    const getActiveNewCount = () => {
        if (timeFilter === 'today') return leadCounts.today;
        if (timeFilter === 'week') return leadCounts.week;
        return leadCounts.month;
    };

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, width: '100%' }}>
            {/* CARD 1: TOTAL LEADS */}
            <Paper onClick={() => handleCardClick('total')} sx={{ p: { xs: 3, md: 5 }, cursor: 'pointer', borderRadius: 0, borderRight: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Total Leads</Typography>
                <Stack sx={{ gap: 1, flexDirection: { xs: 'column', md: 'row', lg: 'column' }, justifyContent: 'space-between' }}>
                    <IconifyIcon icon="material-symbols:leaderboard-rounded" sx={{ fontSize: 48, color: '#f59e0b' }} />
                    <div>
                        <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {loading ? <CircularProgress size={20} /> : leadCounts.total}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>Overall</Typography>
                    </div>
                </Stack>
            </Paper>

            {/* CARD 2: NEW LEADS (WITH DROPDOWN) */}
            <Paper sx={{ p: { xs: 3, md: 5 }, position: 'relative', borderRadius: 0, boxShadow: 'none' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>New Leads</Typography>
                    <FormControl size="small" variant="standard">
                        <Select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', '&:before, &:after': { display: 'none' } }}
                        >
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="week">Week</MenuItem>
                            <MenuItem value="month">Month</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
                <Stack onClick={() => handleCardClick('new')} sx={{ cursor: 'pointer', gap: 1, flexDirection: { xs: 'column', md: 'row', lg: 'column' }, justifyContent: 'space-between' }}>
                    <IconifyIcon icon="material-symbols:today-rounded" sx={{ fontSize: 48, color: '#3b82f6' }} />
                    <div>
                        <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {loading ? <CircularProgress size={20} /> : getActiveNewCount()}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                            {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}
                        </Typography>
                    </div>
                </Stack>
            </Paper>
        </Box>
    );
};

export default LeadSummaryCards;