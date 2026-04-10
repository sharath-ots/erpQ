"use client";

import { forwardRef, useMemo } from "react";
import { useTheme } from "@mui/material";
import { LineChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useSettingsContext } from "../../../../../providers/SettingsProvider.jsx";
import { safePalette } from "../../../../../lib/paletteUtils.js";
import ReactEchart from "../../../../base/ReactEchart.jsx";

echarts.use([LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

const ActivityChart = forwardRef(function ActivityChart({ sx, data }, ref) {
  const { vars } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const option = useMemo(
    () => ({
      grid: { left: 0, right: 0, top: 0, bottom: 0, outerBoundsMode: "none" },
      xAxis: {
        type: "category",
        data: Array.from({ length: data.length }, (_, i) => i + 1),
        axisTick: { show: false },
        axisLine: { show: false },
        boundaryGap: 0,
      },
      yAxis: { type: "value", axisLabel: { show: false }, splitLine: { show: false } },
      series: [{
        data,
        type: "line",
        showSymbol: false,
        width: 1,
        lineStyle: { color: getThemeColor(p.chBlue[500]), width: 1 },
      }],
    }),
    [vars?.palette, getThemeColor, data, p],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={option} sx={sx} />;
});

export default ActivityChart;
