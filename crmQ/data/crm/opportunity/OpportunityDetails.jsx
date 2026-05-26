import { useState, useEffect, useMemo } from 'react';
import { Paper, Stack, Box, CircularProgress, Typography, Divider } from '@mui/material';

import { mapOpportunityToGroupedInfo } from './OpportunityDataMapper';
import ActivityTabs from '../../crm/Activity/ActivityTabs';
import OpportunityDetailsHeader from './OpportunityDetailsHeader'; // Assuming you create a header similar to LeadDetailsHeader

// --- CARD COMPONENT ---
// Thin borders, no shadow, blue titles to match your design system
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

const OpportunityDetails = ({ opportunityId }) => {
    const [rawOppData, setRawOppData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getOpportunityDetails = async () => {
            if (!opportunityId) return;
            setLoading(true);
            try {
                // Update to your actual endpoint for fetching an Opportunity
                const response = await fetch('/api/opportunity'); 
                if (!response.ok) throw new Error(`API error: ${response.status}`);

                const allOpps = await response.json();
                const currentOpp = allOpps.find(o => o.name === opportunityId);

                if (currentOpp) {
                    setRawOppData(currentOpp);
                } else {
                    setError("Opportunity ID not found.");
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        getOpportunityDetails();
    }, [opportunityId]);

    const groupedData = useMemo(() => {
        return rawOppData ? mapOpportunityToGroupedInfo(rawOppData) : null;
    }, [rawOppData]);

    if (loading) return <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!groupedData) return null;

    return (
        <Stack direction="column" spacing={4}>
            <OpportunityDetailsHeader 
                opportunityName={rawOppData?.title || rawOppData?.party_name} 
                opportunityId={opportunityId} 
            />

            {/* --- HORIZONTAL SCROLLABLE SECTION --- */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap', // Prevents cards from dropping to the next line
                gap: 3,
                pb: 2, // Extra padding at the bottom for the scrollbar
                overflowX: 'auto', // Allows horizontal scrolling if items exceed width
                // Custom scrollbar styling for a cleaner "Aurora" look
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#e2e8f0',
                    borderRadius: 10,
                },
            }}>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Target Party" data={groupedData.targetParty} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Opportunity Details" data={groupedData.opportunityDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Value & Currency" data={groupedData.valueCurrency} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Contact Details" data={groupedData.contactDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Organization Details" data={groupedData.organizationDetails} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Market & Location" data={groupedData.marketLocation} /></Box>
                <Box sx={{ minWidth: 320 }}><InfoSection title="Marketing & Ownership" data={groupedData.marketingOwnership} /></Box>
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
                {/* Note: Update ActivityTabs to accept opportunityId if it relies on a specific record type */}
                <ActivityTabs referenceType="Opportunity" referenceName={opportunityId} />
            </Paper>

        </Stack>
    );
};

export default OpportunityDetails;