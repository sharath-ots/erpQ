'use client';

import Grid from '@mui/material/Grid';
import KPI from './KPI';

const CRMKPIs = ({ data }) => {
    return (
        <>
            {data.map((kpi) => (
                // 🚀 EXPERT FIX: Changed size to 4. (4 columns x 3 items = 12 perfectly filled columns!)
                <Grid key={kpi.title} size={{ xs: 12, sm: 12, md: 4 }}>
                    <KPI {...kpi} />
                </Grid>
            ))}
        </>
    );
};

export default CRMKPIs;