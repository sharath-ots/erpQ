'use client';

import { useRouter } from 'next/navigation';
import { Avatar, ButtonBase, Paper, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import IconifyIcon from '../../../../../components/base/IconifyIcon';
import KPI from './KPI';

const CRMKPIs = ({ data }) => {
  const router = useRouter();

  return (
    <>
      {data.map((kpi) => (
        <Grid key={kpi.title} size={{ xs: 6, sm: 4, lg: 6, xl: 4 }}>
          {/* Wrap the component to handle the click and change the cursor */}
          <Box
            onClick={() => kpi.path && router.push(kpi.path)}
            sx={{
              height: '100%',
              cursor: kpi.path ? 'pointer' : 'default',
            }}
          >
            <KPI {...kpi} />
          </Box>
        </Grid>
      ))}

      <Grid size={{ xs: 6, sm: 4, lg: 6, xl: 4 }}>
        <Paper
          background={1}
          sx={{
            height: 1,
            '&:hover': {
              bgcolor: 'background.elevation2',
            },
          }}
        >
          <ButtonBase
            sx={{
              p: { xs: 3, md: 5 },
              height: 1,
              width: 1,
              display: 'grid',
              placeContent: 'center',
              justifyItems: 'center',
            }}
          >
            <Avatar sx={{ mb: 3, bgcolor: 'primary.light' }}>
              <IconifyIcon icon="material-symbols:add-2-rounded" sx={{ fontSize: 24 }} />
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Add New KPI
            </Typography>
          </ButtonBase>
        </Paper>
      </Grid>
    </>
  );
};

export default CRMKPIs;