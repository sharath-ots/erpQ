"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Box from "@mui/material/Box";

export default forwardRef(function ReactEchart(
  { echarts, option, sx, style, ...rest },
  ref,
) {
  const elRef = useRef(null);
  const chartRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      getEchartsInstance: () => chartRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (!elRef.current || !echarts) return undefined;
    const chart = echarts.init(elRef.current, null, { renderer: "canvas" });
    chartRef.current = chart;
    chart.setOption(option ?? {}, { notMerge: true, lazyUpdate: false });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [echarts]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(option ?? {}, { notMerge: true, lazyUpdate: false });
  }, [option]);

  return (
    <Box
      ref={elRef}
      sx={{ width: 1, height: 260, ...sx }}
      style={style}
      {...rest}
    />
  );
});

