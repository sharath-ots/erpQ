"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function SectionHeader({ title, subTitle, actionComponent, sx }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      sx={{ gap: 2, ...sx }}
    >
      <div>
        <Typography variant="h6" sx={{ mb: subTitle ? 0.25 : 0 }}>
          {title}
        </Typography>
        {subTitle ? (
          <Typography variant="body2" color="text.secondary">
            {subTitle}
          </Typography>
        ) : null}
      </div>
      {actionComponent ?? null}
    </Stack>
  );
}

