"use client";

import { useRouter } from 'next/navigation';
import { Box, Button } from '@mui/material';
import LeadDeatils from "../../data/crm/LeadDeatils";

export default function ViewLeadScreen({ id }) {
    const router = useRouter();

    return (
        <Box sx={{ p: 4 }}>
            <Button
                variant="outlined"
                onClick={() => router.push('/m/crmq/lead-list')}
                sx={{ mb: 3 }}
            >
                ← Back to Leads
            </Button>
            {id ? <LeadDeatils leadId={id} /> : <p>Loading Lead Details...</p>}
        </Box>
    )
}