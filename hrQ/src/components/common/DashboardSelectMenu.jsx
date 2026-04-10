"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

/**
 * Aurora-compatible select menu — uses `defaultValue` (uncontrolled) by default.
 */
export default function DashboardSelectMenu({
  options = [],
  onChange,
  defaultValue,
  size = "small",
  sx,
  ...rest
}) {
  return (
    <TextField
      select
      size={size}
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
      sx={{ width: 150, minWidth: 120, ...sx }}
      {...rest}
    >
      {options.map((opt) => (
        <MenuItem key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </MenuItem>
      ))}
    </TextField>
  );
}
