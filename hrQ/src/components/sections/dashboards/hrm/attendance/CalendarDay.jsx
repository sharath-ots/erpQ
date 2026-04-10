"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

const statusColors = {
  "ON TIME": "#dcfce7",
  DELAYED: "#fef9c3",
  ABSENT: "#fee2e2",
  LEAVE: "#dbeafe",
};

const CalendarDay = ({ day, status, isDifferentMonthDay, selected, today, ...other }) => (
  <ButtonBase
    {...other}
    sx={{
      width: 36,
      height: 36,
      borderRadius: 1,
      opacity: isDifferentMonthDay ? 0.4 : 1,
      bgcolor: today ? "primary.main" : (statusColors[status] ?? "transparent"),
      color: today ? "common.white" : "text.primary",
      border: selected ? 2 : 0,
      borderColor: "primary.main",
      "&:hover": { opacity: 0.8 },
    }}
  >
    <Typography variant="caption">{day?.format?.("D") ?? ""}</Typography>
  </ButtonBase>
);

export default CalendarDay;
