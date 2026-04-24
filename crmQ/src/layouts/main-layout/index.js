'use client';

import Box from '@mui/material/Box';
import ThemeSwitcher from '../../../components/Theme/ThemeSwitcher';

const MainLayout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background-color 0.3s ease',
                }}
            >
                <Box sx={{ flex: 1, p: { xs: 2, md: 1 } }}>
                    {children}
                </Box>
            </Box>
            {/* <ThemeSwitcher /> */}
        </Box>
    );
};

export default MainLayout;