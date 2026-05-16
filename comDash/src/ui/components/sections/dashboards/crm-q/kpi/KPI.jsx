'use client';

import { Paper, Stack, Typography } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import useNumberFormat from 'hooks/useNumberFormat';
import IconifyIcon from 'components/base/IconifyIcon';

const KPI = ({ title, subtitle, value, icon }) => {
  const { numberFormat } = useNumberFormat();
  const router = useRouter();
  const pathname = usePathname();

  const handleCardClick = () => {
    let filters = [];
    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes('open opportunities') ||
      lowerTitle.includes('total customers') ||
      lowerTitle.includes('win rate')
    ) {
      // Respects mobile vs desktop base path logic
      const comingSoonPath = pathname.startsWith('/m/') ? '/m/crmq/landing' : '/m/crmq/landing';
      router.push(comingSoonPath);
      return; // Exit early so the rest of the filter logic doesn't run!
    }

    if (lowerTitle.includes('urgent')) {
      // OR condition: Urgency OR Custom Unreplied Email
      filters = [
        [
          { field: 'urgency', operator: 'in', value: 'Immediate, In 1 month' },
          { field: 'custom_unreplied_email', operator: '=', value: '1' }
        ]
      ];
    } else if (lowerTitle.includes('high volume')) {
      filters = [
        [
          { field: 'potential_volume', operator: 'in', value: '11-25 vehicle, 25+ vehicle' },
        ]
      ];
    } else if (lowerTitle.includes('conversion potential')) {
      filters = [{ field: 'conversion_potential', operator: 'in', value: '51 - 75%, 76 - 100%' }];
    } else if (lowerTitle.includes('stale leads')) {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      // This creates 'YYYY-MM-DD', which perfectly filters against the full timestamps
      // shown in your screenshot (e.g., '2026-02-06 15:51:06.338547')
      const fourteenDaysAgoStr = d.toISOString().split('T')[0];

      // 🚀 FIX: Swapped 'not in' for an exact match on 'Open' to match the Backend KPI logic
      filters = [
        { field: 'modified', operator: '<', value: fourteenDaysAgoStr },
        { field: 'status', operator: '=', value: 'Open' }
      ];
    } else if (lowerTitle.includes('new') || lowerTitle.includes('open')) {
      filters = [{ field: 'status', operator: '=', value: 'New' }];
    } else if (lowerTitle.includes('converted')) {
      filters = [{ field: 'status', operator: '=', value: 'Converted' }];
    } else if (lowerTitle.includes('lost') || lowerTitle.includes('archived')) {
      filters = [{ field: 'status', operator: 'in', value: 'Lost Quotation, Do Not Contact, Completed, Hold' }];
    }

    const basePath = pathname.startsWith('/m/crmq') ? '/m/crmq/lead-list' : '/crmq/lead-list';

    if (filters.length > 0) {
      router.push(`${basePath}?filters=${encodeURIComponent(JSON.stringify(filters))}`);
    } else {
      router.push(basePath);
    }
  };

  return (
    <Paper
      onClick={handleCardClick}
      sx={{
        p: { xs: 3, md: 5 },
        height: '100%',
        width: '100%',
        borderRadius: 0,
        boxShadow: 'none',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>

      <Stack sx={{ gap: 1, flexDirection: { xs: 'column', md: 'row', lg: 'column' }, justifyContent: 'space-between' }}>
        <IconifyIcon icon={icon.name} sx={{ flexShrink: 0, order: { md: 1, lg: 0 }, fontSize: 48, color: icon.color }} />
        <div>
          <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
            {typeof value === 'number' ? numberFormat(value) : value}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </div>
      </Stack>
    </Paper>
  );
};

export default KPI;