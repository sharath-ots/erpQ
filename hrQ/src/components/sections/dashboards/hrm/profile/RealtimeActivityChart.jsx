"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material";
import dayjs from "dayjs";
import { BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { getRandomNumber } from "../../../../../lib/utils.js";
import { useSettingsContext } from "../../../../../providers/SettingsProvider.jsx";
import ReactEchart from "../../../../base/ReactEchart.jsx";

echarts.use([TooltipComponent, GridComponent, BarChart, CanvasRenderer, LegendComponent]);

const RealtimeActivityChart = forwardRef(function RealtimeActivityChart({ sx }, ref) {
  const chartRef = useRef(null);
  const { vars } = useTheme();
  const { getThemeColor } = useSettingsContext();
  const [visibleBars, setVisibleBars] = useState(100);
  const [data, setData] = useState(Array(100).fill(50).map(() => getRandomNumber(40, 100)));
  const startTime = dayjs().hour(9).minute(0).second(0);
  const [axisData, setAxisData] = useState(
    Array.from({ length: 100 }, (_, i) => {
      const start = startTime.add(i * 5, "minute").format("h:mmA");
      const end = startTime.add((i + 1) * 5, "minute").format("h:mmA");
      return `${start}-${end}`;
    }),
  );

  const getOptions = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "none" },
        formatter: (params) => `<div><p style="font-size:12px;text-align:center">${params[0].name}</p><p style="font-size:12px;text-align:center">${params[0].seriesName}: ${params[0].value}%</p></div>`,
      },
      xAxis: { type: "category", axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, data: axisData },
      yAxis: { type: "value", scale: true, boundaryGap: false, axisLabel: { show: false }, splitLine: { show: false }, min: 0, max: 100 },
      series: [{
        name: "Activity",
        type: "bar",
        barGap: 4,
        data,
        itemStyle: {
          opacity: 0.48,
          color: getThemeColor(vars?.palette?.common?.white ?? "#fff"),
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: { itemStyle: { opacity: 1, color: getThemeColor(vars?.palette?.common?.white ?? "#fff") } },
        barWidth: 8,
      }],
      grid: { right: 0, left: 0, bottom: 0, top: 0 },
    }),
    [vars?.palette, data, axisData, getThemeColor],
  );

  useEffect(() => {
    const updateBars = () => {
      if (chartRef.current) {
        const width = chartRef.current.getEchartsInstance?.()?.getDom?.()?.getBoundingClientRect?.()?.width ?? 600;
        const newVisibleBars = Math.floor(width / 11);
        setVisibleBars(newVisibleBars);
        setData((prev) => {
          if (prev.length < newVisibleBars) return [...prev, ...Array(newVisibleBars - prev.length).fill(0).map(() => getRandomNumber(40, 100))];
          return prev.slice(0, newVisibleBars);
        });
        setAxisData((prev) => {
          if (prev.length < newVisibleBars) {
            const lastBarTime = dayjs(prev[prev.length - 1].split("-")[1], "h:mmA");
            return [...prev, ...Array.from({ length: newVisibleBars - prev.length }, (_, i) => {
              const start = lastBarTime.add(i * 5, "minute").format("h:mmA");
              const end = lastBarTime.add((i + 1) * 5, "minute").format("h:mmA");
              return `${start}-${end}`;
            })];
          }
          return prev.slice(0, newVisibleBars);
        });
      }
    };
    updateBars();
    window.addEventListener("resize", updateBars);
    return () => window.removeEventListener("resize", updateBars);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => [...prev.slice(1), getRandomNumber(20, 100)]);
      setAxisData((prev) => {
        const lastTime = dayjs(prev[prev.length - 1].split("-")[1], "h:mmA");
        const newStart = lastTime.format("h:mmA");
        const newEnd = lastTime.add(5, "minute").format("h:mmA");
        return [...prev.slice(1), `${newStart}-${newEnd}`];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <ReactEchart ref={chartRef} echarts={echarts} option={getOptions} sx={sx} />;
});

export default RealtimeActivityChart;
