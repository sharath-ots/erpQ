'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from 'helpers/echart-utils';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, GridComponent, PieChart, CanvasRenderer, LegendComponent]);

// Accept the new "colors" prop
const LeadSourcesChart = ({ sx, data, colors, ref }) => {
  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params) => tooltipFormatterList(params),
      },
      legend: { show: false },
      // Use the dynamic colors passed from the parent!
      color: colors || ['#4A90E2'],
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          itemStyle: { borderRadius: 3 },
          padAngle: 2,
          label: { show: false, position: 'center' },
          emphasis: { label: { show: false } },
          labelLine: { show: false },
          data: data,
        },
      ],
      grid: { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    }),
    [data, colors]
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
};

export default LeadSourcesChart;