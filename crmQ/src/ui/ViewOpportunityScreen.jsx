"use client";

import { useRouter } from 'next/navigation';
import { Box, Button } from '@mui/material';
import OpportunityDetails from '../../data/crm/opportunity/OpportunityDetails';

export default function ViewOpportunityScreen({ id }) {
    const router = useRouter();

    return (
        <Box sx={{ p: 4 }}>
            <Button
                variant="outlined"
                onClick={() => router.push('/m/crmq/opportunity-list')}
                sx={{ mb: 3 }}
            >
                ← Back to Opportunities
            </Button>
            {id ? <OpportunityDetails opportunityId={id} /> : <p>Loading Lead Details...</p>}
        </Box>
    )
}