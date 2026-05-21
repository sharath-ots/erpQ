'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from 'helpers/echart-utils';
import { cssVarRgba } from 'lib/utils';
import { useSettingsContext } from 'providers/SettingsProvider';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const ActiveUsersChart = ({ sx, data, ref }) => {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();

  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: cssVarRgba(getThemeColor(vars.palette.chGrey['100Channel']), 0.5) },
          z: 1,
        },
        formatter: (params) => tooltipFormatterList(params),
      },
      xAxis: {
        type: 'category',
        data: data?.dates || [], // 🚀 X-Axis: Dates from API
        axisLine: { lineStyle: { color: getThemeColor(vars.palette.divider) } },
        axisTick: { alignWithLabel: true, length: 9, lineStyle: { color: vars.palette.divider } },
        axisLabel: {
          show: true,
          interval: 2, // Shows every 3rd day to avoid crowding
          fontFamily: typography.fontFamily,
          color: getThemeColor(vars.palette.text.secondary),
          fontWeight: 400,
          fontSize: typography.overline.fontSize,
          margin: 13,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          margin: 40,
          align: 'left',
          formatter: (value) => value, // 🚀 Removed the 'k' divider so it shows whole numbers (1, 5, 12, etc.)
          fontWeight: 500,
          color: getThemeColor(vars.palette.text.secondary),
        },
        splitLine: { lineStyle: { color: getThemeColor(vars.palette.dividerLight) } },
      },
      series: [
        {
          name: 'Leads Generated',
          type: 'bar',
          label: {
            show: true,
            position: 'top', // 🚀 Puts the number above the bar
            color: getThemeColor(vars.palette.chBlue[950]),
            formatter: (params) => (params.value > 0 ? params.value : ''), // Only show labels if > 0
          },
          itemStyle: {
            color: getThemeColor(vars.palette.chBlue[200]),
            borderRadius: [4, 4, 0, 0], // Rounds the top corners
          },
          emphasis: {
            itemStyle: { color: getThemeColor(vars.palette.chBlue[300]) },
          },
          data: data?.counts || [], // 🚀 Y-Axis: Counts from API
        },
      ],
      grid: { left: 40, right: 20, top: 30, bottom: 25, outerBoundsMode: 'none' },
    }),
    [vars.palette, getThemeColor, data, typography],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
};

export default ActiveUsersChart;