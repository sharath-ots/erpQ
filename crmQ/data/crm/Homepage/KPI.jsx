'use client';
import Link from 'next/link';
import { Paper, Stack, Typography, ButtonBase } from '@mui/material';
import useNumberFormat from '@/shared-ui/hooks/useNumberFormat';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';

const KPI = ({ title, subtitle, value, icon, path }) => {
    const { numberFormat } = useNumberFormat();
    const isLink = path && path !== '#';

    return (
        <Paper
            sx={{
                height: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.customShadows?.primary || theme.shadows[4],
                },
            }}
        >
            <ButtonBase
                component={isLink ? Link : 'button'}
                href={isLink ? path : undefined}
                sx={{
                    p: { xs: 3, md: 5 },
                    width: '100%',
                    height: '100%',
                    display: 'block', // Forces content to align properly
                    textAlign: 'left',
                }}
            >
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, mb: 2 }}>
                    {title}
                </Typography>
                <Stack
                    sx={{
                        gap: 1,
                        flexDirection: { xs: 'column', md: 'row', lg: 'column' },
                        justifyContent: 'space-between',
                    }}
                >
                    <IconifyIcon
                        icon={icon.name}
                        sx={{
                            flexShrink: 0,
                            order: { md: 1, lg: 0 },
                            fontSize: 48,
                            color: icon.color,
                        }}
                    />
                    <div>
                        <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {typeof value === 'number' ? numberFormat(value) : value}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: 'text.secondary' }}>
                            {subtitle}
                        </Typography>
                    </div>
                </Stack>
            </ButtonBase>
        </Paper>
    );
};

export default KPI;
