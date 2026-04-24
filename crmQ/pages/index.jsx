import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // Automatically redirect users from localhost:3000 directly to localhost:3000/crm
        router.push('/crm');
    }, [router]);

    // Show a quick loading spinner while the redirect happens
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
}