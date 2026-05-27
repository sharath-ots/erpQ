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

// 🚀 ADDED: onChartClick prop
const CRMGeneratedRevenueChart = ({ sx, data, ref, onChartClick }) => {
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
        formatter: (value) => value,
        fontFamily: typography.fontFamily,
        color: getThemeColor(vars.palette.text.disabled),
        fontWeight: 700,
        fontSize: typography.caption.fontSize,
        margin: 8,
      },
      splitLine: { lineStyle: { color: getThemeColor(vars.palette.dividerLight) } },
    },
    series: [
      { name: 'Lost', type: 'bar', data: data.lost, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chGrey[200]) }, barWidth: 8 },
      // Note: Converted logic often groups 'Converted' and 'Won'. ECharts passes the series name back exactly as written here.
      { name: 'Converted', type: 'bar', data: data.converted, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chGreen[400]) }, barWidth: 8 },
      { name: 'Open', type: 'bar', data: data.open, itemStyle: { borderRadius: [2, 2, 0, 0], color: getThemeColor(vars.palette.chBlue[400]) }, barWidth: 8 },
    ],
    barGap: '50%',
    grid: { left: 0, right: isSafari ? 15 : 0, top: 2, bottom: 1, containLabel: true },
  }), [vars.palette, getThemeColor, data]);

  // 🚀 ADDED: Bind the click event to ECharts
  const onEvents = useMemo(() => ({
    click: (params) => {
      if (onChartClick) {
        // params.seriesName = 'Lost', 'Converted', or 'Open'
        // params.name = The X-axis label (e.g., "Mon", "Tue")
        onChartClick(params.seriesName, params.name);
      }
    }
  }), [onChartClick]);

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} onEvents={onEvents} sx={{ ...sx, width: 1 }} />;
};

export default CRMGeneratedRevenueChart;