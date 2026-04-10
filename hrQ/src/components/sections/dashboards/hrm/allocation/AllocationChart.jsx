"use client";

import { forwardRef, useMemo } from "react";
import { useTheme } from "@mui/material";
import { RadarChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useSettingsContext } from "../../../../../providers/SettingsProvider.jsx";
import { safePalette } from "../../../../../lib/paletteUtils.js";
import ReactEchart from "../../../../base/ReactEchart.jsx";

echarts.use([LegendComponent, TooltipComponent, RadarChart, CanvasRenderer]);

const getLineColor = (category, p, getThemeColor) => {
  switch (category) {
    case "Gross Salary": return getThemeColor(p.chGreen[400]);
    case "Tangible Assets": return getThemeColor(p.chBlue[400]);
    case "Direct Revenue": return getThemeColor(p.chOrange[400]);
    default: return getThemeColor(p.chGrey[400]);
  }
};

const AllocationChart = forwardRef(function AllocationChart({ sx, data }, ref) {
  const { vars, typography } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const p = safePalette(vars?.palette);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const depts = data.workforce.map((item) => item.department);
          if (Array.isArray(params.value)) {
            const tooltipItems = params.value
              .map((item, index) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:120px"><div style="display:flex;align-items:center;gap:8px;"><span style="width:8px;height:8px;background:${params.color};border-radius:50%;"></span><span>${depts[index]}</span></div><span>${item}</span></div>`)
              .join("");
            return `<div style="margin-left:8px;"><p>${params.name}</p>${tooltipItems}</div>`;
          }
          return "";
        },
      },
      legend: { show: false },
      radar: {
        radius: "80%",
        axisNameGap: 8,
        splitNumber: 6,
        axisLine: { show: false },
        splitLine: { show: false },
        axisName: {
          fontSize: 12,
          fontWeight: 700,
          color: getThemeColor(vars?.palette?.text?.secondary ?? "#666"),
          fontFamily: typography?.fontFamily,
        },
        splitArea: {
          areaStyle: {
            color: [p.background.paper, p.background.elevation2],
            shadowBlur: 0,
          },
        },
        indicator: data.workforce.map((item) => ({ name: item.department.toUpperCase() })),
      },
      series: [{
        name: "allocation",
        type: "radar",
        lineStyle: { width: 1 },
        symbol: "circle",
        symbolSize: 3,
        data: data.expenses.map((item) => ({
          name: item.category,
          value: item.budgets,
          itemStyle: { color: getLineColor(item.category, p, getThemeColor) },
        })),
      }],
    }),
    [vars?.palette, getThemeColor, data, p, typography],
  );

  return <ReactEchart ref={ref} echarts={echarts} option={option} sx={sx} />;
});

export default AllocationChart;
