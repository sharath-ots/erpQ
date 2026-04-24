import { useState, useEffect, useMemo } from 'react';
import { Paper, Stack, Box, CircularProgress, Typography, Divider } from '@mui/material';

import { mapLeadToGroupedInfo } from './LeadData';
import ActivityTabs from '../crm/Activity/ActivityTabs';
import LeadDetailsHeader from './LeadDetailsHeader';

// --- CARD COMPONENT ---
// Matches your screenshot: Thin borders, no shadow, blue titles.
const InfoSection = ({ title, data }) => (
    <Paper sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none'
    }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
            {title}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Internal layout for the data points */}
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 2.5
        }}>
            {data.map((item, idx) => (
                <Box key={idx} sx={{ wordBreak: 'break-word' }}>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 900 }}
                    >
                        {item.label}
                    </Typography>
                    {item.value}
                </Box>
            ))}
        </Box>
    </Paper>
);

const LeadDetails = ({ leadId }) => {
    const [rawLeadData, setRawLeadData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getLeadDetails = async () => {
            if (!leadId) return;
            setLoading(true);
            try {
                const response = await fetch('/api/lead');
                if (!response.ok) throw new Error(`API error: ${response.status}`);

                const allLeads = await response.json();
                const currentLead = allLeads.find(l => l.name === leadId);

                if (currentLead) {
                    setRawLeadData(currentLead);
                } else {
                    setError("Lead ID not found.");
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        getLeadDetails();
    }, [leadId]);

    const groupedData = useMemo(() => {
        return rawLeadData ? mapLeadToGroupedInfo(rawLeadData) : null;
    }, [rawLeadData]);

    if (loading) return <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!groupedData) return null;

    return (
        <Stack direction="column" spacing={4}>
            <LeadDetailsHeader leadName={rawLeadData?.lead_name} />

            {/* --- HORIZONTAL SCROLLABLE SECTION --- */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap', // 👈 Prevents cards from dropping to the next line
                gap: 3,
                pb: 2, // Extra padding at the bottom for the scrollbar
                overflowX: 'auto', // 👈 Allows horizontal scrolling if items exceed width
                // Custom scrollbar styling for a cleaner "Aurora" look
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#e2e8f0',
                    borderRadius: 10,
                },
            }}>
                {/* Ensure each InfoSection has a fixed or minimum width so they don't squish */}
                <Box sx={{ minWidth: 320 }}><InfoSection title="Personal Information" data={groupedData.personalInfo} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Contact Details" data={groupedData.contactDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Organization Details" data={groupedData.organizationDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Address Details" data={groupedData.addressDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Classification" data={groupedData.classification} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Qualification & Status" data={groupedData.qualification} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Additional Information" data={groupedData.additionalInfo} /></Box>
            </Box>

            {/* --- BOTTOM SECTION: ACTIVITY TABS --- */}
            <Paper sx={{
                px: { xs: 3, md: 5 },
                py: 5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none'
            }}>
                <ActivityTabs leadId={leadId} />
            </Paper>

        </Stack>
    );
};

export default LeadDetails;