import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, CircularProgress, Stack } from '@mui/material';
import LeadCard from './LeadCard';

const CustomKanbanBoard = () => {
    const [columns, setColumns] = useState({
        '🔥 Overdue': [],
        '⚡ Due Today': [],
        '⏳ Due Tomorrow': [],
        '🛠️ No Date Set': []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndSortLeads = async () => {
            try {
                const res = await fetch('/api/lead');
                if (!res.ok) throw new Error(`API Error ${res.status}`);
                const erpLeads = await res.json();
                bucketLeadsByUrgency(erpLeads);
            } catch (error) {
                console.error("Failed to fetch leads:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAndSortLeads();
    }, []);

    const bucketLeadsByUrgency = (erpLeads) => {
        const newCols = {
            '🔥 Overdue': [],
            '⚡ Due Today': [],
            '⏳ Due Tomorrow': [],
            '🛠️ No Date Set': []
        };

        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

        erpLeads.forEach(lead => {
            const actionDateRaw = lead.calculated_action_date;
            const actionDateStr = actionDateRaw ? actionDateRaw.split(' ')[0] : null;

            const formattedLead = {
                id: lead.name,
                company: lead.lead_name || 'Unknown',
                contact: lead.email_id || 'No Email',
                source: lead.source || 'Direct',
                value: lead.annual_revenue || 0,
                stage: lead.status || 'Open',
                nextActionTitle: lead.next_action_title,
                nextActionType: lead.next_action_type,
            };

            if (!actionDateStr) {
                newCols['🛠️ No Date Set'].push(formattedLead);
            } else if (actionDateStr < todayStr) {
                newCols['🔥 Overdue'].push(formattedLead);
            } else if (actionDateStr === todayStr) {
                newCols['⚡ Due Today'].push(formattedLead);
            } else if (actionDateStr === tomorrowStr) {
                newCols['⏳ Due Tomorrow'].push(formattedLead);
            } else {
                newCols['🛠️ No Date Set'].push(formattedLead);
            }
        });
        setColumns(newCols);
    };

    const handleDragStart = (e, leadId, sourceColumn) => {
        e.dataTransfer.setData('leadId', leadId);
        e.dataTransfer.setData('sourceColumn', sourceColumn);
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e, targetColumn) => {
        const leadId = e.dataTransfer.getData('leadId');
        const sourceColumn = e.dataTransfer.getData('sourceColumn');
        if (sourceColumn === targetColumn) return;

        setColumns((prev) => {
            const sourceList = [...prev[sourceColumn]];
            const targetList = [...prev[targetColumn]];
            const leadIndex = sourceList.findIndex(l => l.id === leadId);
            const [movedLead] = sourceList.splice(leadIndex, 1);
            targetList.push(movedLead);
            return { ...prev, [sourceColumn]: sourceList, [targetColumn]: targetList };
        });
    };

    if (loading) {
        return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{
            display: 'flex',
            gap: 3,
            p: 3,
            height: '100%',
            overflowX: 'auto',
            bgcolor: 'background.default',
        }}>
            {Object.entries(columns).map(([columnName, leads]) => (
                <Box
                    key={columnName}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, columnName)}
                    sx={{
                        width: 340,
                        flexShrink: 0,
                        bgcolor: (theme) => theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {/* Column Header */}
                    <Box sx={{
                        p: 2.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.3px' }}>
                            {columnName}
                        </Typography>
                        <Chip
                            label={leads.length}
                            size="small"
                            sx={{
                                fontWeight: 800,
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                borderRadius: 1.5
                            }}
                        />
                    </Box>

                    {/* Column Body / Droppable Area */}
                    <Box sx={{
                        p: 2,
                        flexGrow: 1,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' }
                    }}>
                        {leads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                onDragStart={(e) => handleDragStart(e, lead.id, columnName)}
                            />
                        ))}

                        {/* Empty state visual padding so the column is still droppable at the bottom */}
                        {leads.length === 0 && (
                            <Box sx={{
                                height: 80,
                                border: '2px dashed',
                                borderColor: 'divider',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                    Drop leads here
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default CustomKanbanBoard;