"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * Stub for Aurora StyledDateCalendar. Renders a placeholder until
 * @mui/x-date-pickers is wired in. The attendance calendar will
 * show a minimal view via AttendanceCalendar's slots prop.
 */
export default function StyledDateCalendar({ value, onChange, slots, showDaysOutsideCurrentMonth, fixedWeekNumber, sx, ...rest }) {
  const header = value?.format?.("MMMM YYYY") ?? "";
  return (
    <Box
      sx={{
        minHeight: 300,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1,
        p: 2,
        ...sx,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {header}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Attendance Calendar
      </Typography>
    </Box>
  );
}
