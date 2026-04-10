"use client";

import { useCallback, useState } from "react";

/**
 * Matches Aurora template: toggles ECharts legend + local active state.
 * Requires chart ref from {@link ../components/base/ReactEchart.jsx} with `getEchartsInstance()`.
 */
export default function useToggleChartLegends(chartRef) {
  const [legendState, setLegendState] = useState({});

  const handleLegendToggle = useCallback(
    (legendName) => {
      chartRef.current?.getEchartsInstance?.()?.dispatchAction({
        type: "legendToggleSelect",
        name: legendName,
      });

      setLegendState((prev) => ({
        ...prev,
        [legendName]: !prev[legendName],
      }));
    },
    [chartRef],
  );

  return { legendState, handleLegendToggle };
}
