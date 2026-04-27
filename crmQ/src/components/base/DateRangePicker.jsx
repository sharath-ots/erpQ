"use client"; // 1. Required for useState and MUI media queries in Next.js

import { useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import { Box, Button, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import IconifyIcon from './IconifyIcon';
import 'react-datepicker/dist/react-datepicker.css'; // Ensure CSS is loaded

const DateRangePicker = ({
  defaultStartDate = null,
  defaultEndDate = null,
  onChange,
  sx,
  ...rest
}) => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // 2. Replaced custom useBreakpoints with standard MUI hooks
  const theme = useTheme();
  const upSm = useMediaQuery(theme.breakpoints.up('sm'));

  const handleChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    // 3. Safety check: ensure onChange is actually a function before calling it
    if (typeof onChange === 'function') {
      onChange(dates);
    }
  };

  return (
    <Box sx={{ ...sx }}>
      <ReactDatePicker
        selected={startDate}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
        onChange={handleChange}
        popperPlacement={upSm ? 'bottom-start' : undefined}
        showPopperArrow={false}
        selectsRange
        wrapperClassName={rest.isClearable && (startDate || endDate) ? 'clearable' : ''}
        customInput={<TextField label="Select Date Range" fullWidth />}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <Stack sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: 'row' }}>
            <Button
              shape="square"
              color="neutral"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
            >
              <IconifyIcon icon="material-symbols:chevron-left-rounded" sx={{ fontSize: 20 }} />
            </Button>

            <Typography variant="button">
              {date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}
            </Typography>

            <Button
              shape="square"
              color="neutral"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
            >
              <IconifyIcon icon="material-symbols:chevron-right-rounded" sx={{ fontSize: 20 }} />
            </Button>
          </Stack>
        )}
        {...rest}
      />
    </Box>
  );
};

export default DateRangePicker;