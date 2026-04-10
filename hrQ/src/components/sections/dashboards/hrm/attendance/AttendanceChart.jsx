"use client";

import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { tooltipFormatterList } from "../../../../../helpers/echart-utils.js";
import { useSettingsContext } from "../../../../../providers/SettingsProvider.jsx";
import { safePalette } from "../../../../../lib/paletteUtils.js";
import ReactEchart from "../../../../base/ReactEchart.jsx";

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer]);

const AttendanceChart = ({ data, sx }) => {
  const { vars, direction, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);
  const { summary } = data;

  const option = useMemo(
    () => ({
      grid: direction === "rtl"
        ? { left: -20, right: 25, top: 5, bottom: 5, outerBoundsMode: "none" }
        : { left: 35, right: -20, top: 5, bottom: 5, outerBoundsMode: "none" },
      tooltip: { formatter: (params) => tooltipFormatterList(params) },
      xAxis: {
        type: "category",
        data: summary.map((item) => item.status),
        inverse: direction === "rtl",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          rotate: direction === "rtl" ? -90 : 90,
          inside: true,
          fontSize: 14,
          fontFamily: typography?.fontFamily,
          rich: {
            green: { color: vars?.palette?.success?.main ?? "#22c55e" },
            orange: { color: vars?.palette?.warning?.main ?? "#f97316" },
            red: { color: vars?.palette?.error?.main ?? "#ef4444" },
            blue: { color: vars?.palette?.primary?.main ?? "#3f8ef5" },
          },
          formatter: (value) => {
            const colorMap = { "ON TIME": "green", DELAYED: "orange", ABSENT: "red", LEAVE: "blue" };
            return `{${colorMap[value] ?? "blue"}|${value}}`;
          },
          verticalAlign: "bottom",
          padding: [0, 0, 8, 0],
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 30,
        position: direction === "rtl" ? "right" : "left",
        axisLabel: { color: getThemeColor(p.text.disabled ?? "#aaa"), fontFamily: typography?.fontFamily, padding: [0, 10, 0, 0] },
        splitLine: { lineStyle: { color: getThemeColor(p.chGrey[200]) } },
      },
      series: [{
        data: summary.map((item) => item.count),
        type: "bar",
        barWidth: 8,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: (params) => {
            const colors = [
              getThemeColor(p.chGreen[100]),
              getThemeColor(p.chOrange[100]),
              getThemeColor(p.chRed[100]),
              getThemeColor(p.chBlue[100]),
            ];
            return colors[params.dataIndex] ?? colors[0];
          },
        },
      }],
    }),
    [data, vars?.palette, getThemeColor, direction, typography, p],
  );

  return <ReactEchart echarts={echarts} option={option} sx={sx} />;
};

export default AttendanceChart;
