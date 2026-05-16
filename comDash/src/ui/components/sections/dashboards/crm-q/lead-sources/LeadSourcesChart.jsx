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

// 🚀 Accept onEvents prop
const LeadSourcesChart = ({ sx, data, colors, onEvents, ref }) => {
  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params) => tooltipFormatterList(params),
      },
      legend: { show: false },
      color: colors || ['#4A90E2'],
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          // 🚀 Add cursor: 'pointer' to itemStyle
          itemStyle: { borderRadius: 3, cursor: 'pointer' },
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

  // 🚀 Pass onEvents into your ReactEchart wrapper
  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} onEvents={onEvents} />;
};

export default LeadSourcesChart;