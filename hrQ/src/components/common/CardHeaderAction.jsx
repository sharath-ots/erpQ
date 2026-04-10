"use client";

import Stack from "@mui/material/Stack";

export default function CardHeaderAction({ children }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
      {children}
    </Stack>
  );
}
