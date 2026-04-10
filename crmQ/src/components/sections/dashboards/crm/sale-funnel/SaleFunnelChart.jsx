'use client';

import { forwardRef, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from '../../../../../helpers/echart-utils.js';
import { safePalette } from '../../../../../lib/paletteUtils.js';
import { useSettingsContext } from '../../../../../providers/SettingsProvider.jsx';
import ReactEchart from '../../../../base/ReactEchart.jsx';

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const SaleFunnelChart = forwardRef(function SaleFunnelChart({ sx, data }, ref) {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params) => tooltipFormatterList(params),
      },
      legend: { data: Object.keys(data).flat(), show: false },
      xAxis: { type: 'value', show: false, inverse: true },
      yAxis: {
        type: 'category',
        data: Object.keys(data)
          .flat()
          .map((item) => item[0].toUpperCase() + item.slice(1)),
        axisLabel: {
          show: true,
          align: 'left',
          margin: 100,
          color: getThemeColor(p.text.secondary),
          fontFamily: typography?.fontFamily,
          fontSize: typography?.subtitle2?.fontSize,
          fontWeight: 500,
        },
        axisTick: false,
        axisLine: false,
        inverse: true,
        boundaryGap: true,
      },
      series: [
        {
          type: 'bar',
          showBackground: true,
          backgroundStyle: {
            borderRadius: 4,
            color: getThemeColor(vars?.palette?.background?.elevation2 ?? '#f0f0f0'),
          },
          data: Object.values(data).flat(),
          label: {
            show: true,
            fontSize: typography?.subtitle2?.fontSize,
            fontWeight: 500,
            formatter: (params) => `${Number(params.value)}%`,
          },
          emphasis: { disabled: true },
          itemStyle: {
            borderRadius: 4,
            color: (params) => {
              const colors = [
                getThemeColor(p.chBlue[100]),
                getThemeColor(p.chBlue[200]),
                getThemeColor(p.chBlue[300]),
                getThemeColor(p.chBlue[400]),
                getThemeColor(p.chBlue[500]),
              ];
              return colors[params.dataIndex] ?? getThemeColor(p.chGreen[500]);
            },
          },
          barWidth: 28,
          barGap: 16,
        },
      ],
      grid: { left: 100, right: 0, top: 0, bottom: 0, outerBoundsMode: 'none' },
    }),
    [p, getThemeColor, data, vars?.palette?.background?.elevation2],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
});

export default SaleFunnelChart;
