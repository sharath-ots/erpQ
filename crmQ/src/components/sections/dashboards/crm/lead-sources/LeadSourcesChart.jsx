'use client';

import { forwardRef, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from '../../../../../helpers/echart-utils.js';
import { safePalette } from '../../../../../lib/paletteUtils.js';
import { useSettingsContext } from '../../../../../providers/SettingsProvider.jsx';
import ReactEchart from '../../../../base/ReactEchart.jsx';

echarts.use([TooltipComponent, GridComponent, PieChart, CanvasRenderer, LegendComponent]);

const LeadSourcesChart = forwardRef(function LeadSourcesChart({ sx, data }, ref) {
  const { vars } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params) => tooltipFormatterList(params),
      },
      legend: { show: false },
      color: [
        getThemeColor(p.chBlue[400]),
        getThemeColor(p.chOrange[400]),
        getThemeColor(p.chLightBlue[400]),
        getThemeColor(p.chGreen[400]),
      ],
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
    [p, getThemeColor, data],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
});

export default LeadSourcesChart;
