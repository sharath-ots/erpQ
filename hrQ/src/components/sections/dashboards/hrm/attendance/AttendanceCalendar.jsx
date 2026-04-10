"use client";

import { forwardRef, useImperativeHandle } from "react";
import Box from "@mui/material/Box";
import StyledDateCalendar from "../../../../styled/StyledDateCalendar.jsx";
import CalendarDay from "./CalendarDay.jsx";

const AttendanceCalendar = forwardRef(function AttendanceCalendar({ currentDate, setCurrentDate, attendance, sx }, ref) {
  useImperativeHandle(ref, () => ({
    goToNextMonth: () => setCurrentDate((prev) => prev.add(1, "month")),
    goToPreviousMonth: () => setCurrentDate((prev) => prev.subtract(1, "month")),
  }));

  return (
    <Box sx={sx}>
      <StyledDateCalendar
        value={currentDate}
        onChange={(newValue) => newValue && setCurrentDate(newValue)}
        slots={{
          calendarHeader: () => null,
          day: (dayProps) => (
            <CalendarDay
              {...dayProps}
              status={attendance.details[Number(dayProps.day?.format?.("D") ?? 1) - 1]?.status ?? "ON TIME"}
            />
          ),
        }}
        showDaysOutsideCurrentMonth
        fixedWeekNumber={5}
        sx={{ minHeight: 300 }}
      />
    </Box>
  );
});

export default AttendanceCalendar;
