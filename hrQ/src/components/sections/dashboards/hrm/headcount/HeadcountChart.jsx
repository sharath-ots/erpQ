"use client";

import { forwardRef, useMemo } from "react";
import { useTheme } from "@mui/material";
import { BarChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { tooltipFormatterList } from "../../../../../helpers/echart-utils.js";
import { useSettingsContext } from "../../../../../providers/SettingsProvider.jsx";
import { safePalette } from "../../../../../lib/paletteUtils.js";
import ReactEchart from "../../../../base/ReactEchart.jsx";

echarts.use([LegendComponent, TooltipComponent, BarChart, CanvasRenderer]);

const HeadcountChart = forwardRef(function HeadcountChart({ sx, data }, ref) {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const option = useMemo(
    () => ({
      grid: { left: 25, right: 0, top: 10, bottom: 50 },
      tooltip: { formatter: (params) => tooltipFormatterList(params) },
      legend: { show: false },
      xAxis: {
        type: "category",
        data: data.map((item) => item.period),
        axisLabel: {
          rotate: 47,
          margin: 35,
          fontSize: 12,
          align: "center",
          color: getThemeColor(p.text.disabled),
          fontFamily: typography?.fontFamily,
          padding: [0, 0, 0, 5],
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: getThemeColor(p.text.disabled) },
        splitLine: { lineStyle: { color: getThemeColor(p.chGrey[200]) } },
      },
      series: [
        { name: "Involuntary", type: "bar", stack: "total", barWidth: 8, data: data.map((item) => item.stats.involuntary), itemStyle: { borderWidth: 1, borderColor: p.background.elevation1, borderRadius: [5, 5, 0, 0], color: getThemeColor(p.chBlue[200]) } },
        { name: "Voluntary", type: "bar", stack: "total", barWidth: 8, data: data.map((item) => item.stats.voluntary), itemStyle: { borderWidth: 1, borderColor: getThemeColor(p.background.elevation1), borderRadius: [5, 5, 0, 0], color: getThemeColor(p.chBlue[100]) } },
        { name: "Other", type: "bar", stack: "total", barWidth: 8, data: data.map((item) => item.stats.other), itemStyle: { borderWidth: 1, borderColor: getThemeColor(p.background.elevation1), borderRadius: [5, 5, 0, 0], color: getThemeColor(p.chGrey[200]) } },
      ],
    }),
    [vars?.palette, getThemeColor, data, p, typography],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={option} sx={sx} />;
});

export default HeadcountChart;
