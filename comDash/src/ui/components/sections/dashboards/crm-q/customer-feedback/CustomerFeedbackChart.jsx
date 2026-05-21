'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useSettingsContext } from 'providers/SettingsProvider';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, GridComponent, BarChart, LineChart, CanvasRenderer, LegendComponent]);

const CustomerFeedbackChart = ({ sx, data, ref }) => {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();

  const getOptions = useMemo(() => ({
    legend: { data: ['Received', 'Sent', 'Meetings'], show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      // THE FIX: This custom formatter strips the minus sign visually from the tooltip!
      formatter: function (params) {
        let result = `<div style="margin-bottom:4px;font-weight:600;color:#fff;">${params[0].axisValue}</div>`;
        params.forEach(item => {
          // Math.abs() converts -81 to 81 just for the text display
          result += `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;color:#fff;font-size:13px;">
                         <div>${item.marker} ${item.seriesName}</div>
                         <div style="font-weight:bold;">${Math.abs(item.value)}</div>
                       </div>`;
        });
        return result;
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Matches your dark tooltip theme
      borderColor: 'transparent',
      padding: [8, 12]
    },
    xAxis: {
      type: 'category', axisLabel: { show: false },
      data: Array.from({ length: 13 }, (_, i) => dayjs().subtract(12 - i, 'month').format('MMM YYYY')),
      axisLine: false, axisTick: false,
    },
    yAxis: {
      position: 'right',
      axisLabel: {
        align: 'right', margin: 30,
        formatter: (value) => Math.abs(value), // Hides minus signs on the right-side labels
        fontFamily: typography.fontFamily, color: getThemeColor(vars.palette.text.secondary), fontWeight: 400, fontSize: typography.caption.fontSize,
      },
      splitLine: false,
    },
    series: [
      { name: 'Received', type: 'bar', stack: 'one', data: data.received, barWidth: 12, itemStyle: { borderRadius: [4, 4, 0, 0], color: getThemeColor(vars.palette.chBlue[200]) } },
      { name: 'Sent', type: 'bar', stack: 'one', barWidth: 12, data: data.sent, itemStyle: { borderRadius: [0, 0, 4, 4], color: getThemeColor(vars.palette.chGrey[200]) } },
      { name: 'Meetings', data: data.meetings, type: 'line', smooth: 0.3, showSymbol: false, symbol: 'circle', zlevel: 1, itemStyle: { color: getThemeColor(vars.palette.chBlue[500]) }, lineStyle: { width: 2, color: getThemeColor(vars.palette.chBlue[500]) } },
    ],
    grid: { left: 10, right: 45, top: 20, bottom: 10, containLabel: true },
  }), [vars.palette, getThemeColor, data]);

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={{ ...sx, width: 1 }} />;
};

export default CustomerFeedbackChart;