'use client';

import { forwardRef, useMemo } from 'react';
import { isSafari } from 'react-device-detect';
import { useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from '../../../../../helpers/echart-utils.js';
import { safePalette } from '../../../../../lib/paletteUtils.js';
import { cssVarRgba } from '../../../../../lib/utils.js';
import { useSettingsContext } from '../../../../../providers/SettingsProvider.jsx';
import ReactEchart from '../../../../base/ReactEchart.jsx';

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const CRMGeneratedRevenueChart = forwardRef(function CRMGeneratedRevenueChart({ sx, data }, ref) {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: cssVarRgba(getThemeColor(p.chGrey['100Channel']), 0.5),
          },
          z: 1,
        },
        formatter: (params) => tooltipFormatterList(params),
      },
      legend: {
        data: ['25th', '50th', '75th'],
        show: false,
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 7 }, (_, i) => {
          const date = dayjs('2023-01-01').add(i * 3, 'month');
          const quarter = Math.floor(date.month() / 3) + 1;

          return `${date.year()} Q${quarter}`;
        }),
        axisLine: {
          lineStyle: {
            color: getThemeColor(p.divider),
          },
        },
        axisTick: false,
        axisLabel: {
          show: true,
          fontFamily: typography.fontFamily,
          color: getThemeColor(p.text.disabled),
          fontWeight: 500,
          fontSize: typography?.caption?.fontSize,
          margin: 8,
        },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        axisLabel: {
          show: true,
          formatter: (value) => value / 1000 + 'k',
          fontFamily: typography?.fontFamily,
          color: getThemeColor(p.text.disabled),
          fontWeight: 700,
          fontSize: typography.caption.fontSize,
          margin: 8,
        },
        splitLine: {
          lineStyle: {
            color: getThemeColor(p.dividerLight),
          },
        },
      },
      series: [
        {
          name: '25th',
          type: 'bar',
          data: data['25th'],
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: getThemeColor(p.chGrey[200]),
          },
          barWidth: 8,
          emphasis: {
            disabled: true,
          },
        },
        {
          name: '50th',
          type: 'bar',
          data: data['50th'],
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: getThemeColor(p.chGreen[400]),
          },
          barWidth: 8,
          emphasis: {
            disabled: true,
          },
        },
        {
          name: '75th',
          type: 'bar',
          data: data['75th'],
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: getThemeColor(p.chBlue[400]),
          },
          barWidth: 8,
          emphasis: {
            disabled: true,
          },
        },
      ],
      barGap: '50%',
      grid: {
        left: 0,
        right: isSafari ? 15 : 0,
        top: 2,
        bottom: 1,
        outerBoundsMode: 'same',
      },
    }),
    [p, getThemeColor, data],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
});

export default CRMGeneratedRevenueChart;
