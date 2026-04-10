"use client";

import { forwardRef } from "react";

/**
 * Minimal, dependency-light placeholder for the Aurora template's DateRangePicker.
 * Keeps the CRM dashboard layout intact; wire real range picking later if needed.
 */
const DateRangePicker = forwardRef(function DateRangePicker(
  { customInput, placeholderText, sx, ...rest },
  ref,
) {
  const Input = customInput ?? <input />;
  return (
    <span style={{ width: "100%", display: "block" }} ref={ref}>
      {Input
        ? // Render the provided MUI input as-is; this component is just a shell.
          Input
        : null}
    </span>
  );
});

export default DateRangePicker;

