'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { FunnelChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useSettingsContext } from 'providers/SettingsProvider';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, GridComponent, FunnelChart, CanvasRenderer, LegendComponent]);

const SaleFunnelChart = ({ sx, data, ref }) => {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();

  const getOptions = useMemo(() => {
    const safeData = data || [];

    // THE FIX: Decouple the shape from the numbers!
    // This forces a perfectly shaped funnel visually, while keeping the real numbers for labels.
    const formattedData = safeData.map((item, index) => ({
      name: item.name,
      value: 100 - (index * 20), // Visual width: 100, 80, 60, 40 (perfect triangle shape)
      realValue: item.value // The actual ERPNext number
    }));

    return {
      tooltip: {
        trigger: 'item',
        // Show the real ERPNext number in the hover tooltip!
        formatter: (params) => `${params.name} : <span style="font-weight:bold">${params.data.realValue}</span>`
      },
      color: [
        getThemeColor(vars.palette.chBlue[200]),
        getThemeColor(vars.palette.chBlue[300]),
        getThemeColor(vars.palette.chBlue[400]),
        getThemeColor(vars.palette.chGreen[500]),
      ],
      series: [
        {
          type: 'funnel',
          left: '10%',
          width: '80%',
          sort: 'descending',
          gap: 2, // Adds a nice clean space between the slices
          label: {
            show: true,
            position: 'inside',
            // Show the real ERPNext number inside the actual funnel!
            formatter: (params) => `${params.data.realValue}`,
            color: '#fff',
            fontFamily: typography.fontFamily,
            fontWeight: 600,
            fontSize: 16
          },
          itemStyle: {
            borderColor: getThemeColor(vars.palette.background.paper),
            borderWidth: 2,
            borderRadius: 4
          },
          data: formattedData
        }
      ]
    };
  }, [vars.palette, getThemeColor, data, typography.fontFamily]);

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
};

export default SaleFunnelChart;