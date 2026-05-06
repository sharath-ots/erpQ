'use client';

import { useMemo } from 'react';
import { isSafari } from 'react-device-detect';
import { useTheme } from '@mui/material';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { cssVarRgba } from 'lib/utils';
import { useSettingsContext } from 'providers/SettingsProvider';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const CRMGeneratedRevenueChart = ({ sx, data, ref }) => {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();

  const getOptions = useMemo(() => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: cssVarRgba(getThemeColor(vars.palette.chGrey['100Channel']), 0.5) }, z: 1 },
      },
      legend: { data: ['Lost', 'Converted', 'Open'], show: false },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLine: { lineStyle: { color: getThemeColor(vars.palette.divider) } },
        axisTick: false,
        axisLabel: { show: true, fontFamily: typography.fontFamily, color: getThemeColor(vars.palette.text.disabled), fontWeight: 500, fontSize: typography.caption.fontSize, margin: 8 },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        axisLabel: {
          show: true,
          formatter: (value) => value, // Fix for 0k bug! Just shows the pure number.
          fontFamily: typography.fontFamily, color: getThemeColor(vars.palette.text.disabled), fontWeight: 700, fontSize: typography.caption.fontSize, margin: 8,
        },
        splitLine: { lineStyle: { color: getThemeColor(vars.palette.dividerLight) } },
      },
      series: [
        { name: 'Lost', type: 'bar', data: data.lost, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chGrey[200]) }, barWidth: 8 },
        { name: 'Converted', type: 'bar', data: data.converted, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chGreen[400]) }, barWidth: 8 },
        { name: 'Open', type: 'bar', data: data.open, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chBlue[400]) }, barWidth: 8 },
      ],
      barGap: '50%',
      grid: { left: 0, right: isSafari ? 15 : 0, top: 2, bottom: 1, outerBoundsMode: 'same' },
    }), [vars.palette, getThemeColor, data]);

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
};

export default CRMGeneratedRevenueChart;