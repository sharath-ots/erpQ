'use client';

import { forwardRef, useMemo } from 'react';
import { useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { tooltipFormatterList } from '../../../../../helpers/echart-utils.js';
import { safePalette } from '../../../../../lib/paletteUtils.js';
import { cssVarRgba, getPastDates } from '../../../../../lib/utils.js';
import { useSettingsContext } from '../../../../../providers/SettingsProvider.jsx';
import ReactEchart from '../../../../base/ReactEchart.jsx';

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const ActiveUsersChart = forwardRef(function ActiveUsersChart({ sx, data }, ref) {
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
      xAxis: {
        type: 'category',
        data: getPastDates(15).map((date) => {
          return dayjs(date).format('MMM DD');
        }),
        axisLine: {
          lineStyle: {
            color: getThemeColor(p.divider),
          },
        },
        axisTick: {
          alignWithLabel: true,
          length: 9,
          lineStyle: {
            color: p.divider,
          },
        },
        axisLabel: {
          show: true,
          interval: 6,
          fontFamily: typography?.fontFamily,
          color: getThemeColor(p.text.secondary),
          fontWeight: 400,
          fontSize: typography?.overline?.fontSize,
          margin: 13,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          margin: 40,
          align: 'left',
          formatter: (value) => `${Number(value) / 1000}k`,
          fontWeight: 500,
          color: getThemeColor(p.text.secondary),
        },
        splitLine: {
          lineStyle: {
            color: getThemeColor(p.dividerLight),
          },
        },
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: data.placeholder,
          tooltip: {
            show: false,
          },
        },
        {
          name: 'Active Users',
          type: 'bar',
          stack: 'Total',
          label: {
            show: true,
            position: 'inside',
            color: getThemeColor(p.chBlue[950] ?? p.chBlue[900] ?? p.chBlue[500]),
            formatter: (params) => `${Number(params.value) / 1000}k`,
          },
          itemStyle: {
            color: getThemeColor(p.chBlue[200]),
            borderRadius: 4,
          },
          emphasis: {
            itemStyle: {
              color: getThemeColor(p.chBlue[200]),
            },
          },
          data: data.users,
        },
      ],
      grid: { left: 40, right: 0, top: 30, bottom: 25, outerBoundsMode: 'none' },
    }),
    [p, getThemeColor, data],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={getOptions} sx={sx} />;
});

export default ActiveUsersChart;
