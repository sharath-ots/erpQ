import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledTextField from 'components/styled/StyledTextField';

const TopSection = ({ handleSearch, handleToggleFilterPanel, sx, ...rest }) => {
  const { up } = useBreakpoints();
  const upSm = up('sm');
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      gap={2}
      {...rest}
      sx={{ justifyContent: 'space-between', ...sx }}
    >
      <Stack gap={3} sx={{ alignItems: 'center' }}>
        <Typography variant="h5" sx={{ typography: { xs: 'h6', md: 'h5' } }}>
          Earnings and Deductions
        </Typography>
        <Button variant="soft" color="neutral" sx={{ ml: 'auto' }}>
          Import
        </Button>
      </Stack>
      <Stack gap={1} sx={{ alignItems: 'center' }}>
        <StyledTextField
          id="search-employee-field"
          type="search"
          placeholder="Search Employee"
          fullWidth
          onChange={handleSearch}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon="material-symbols:search-rounded" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: 250 }}
        />
        <Button
          shape={upSm ? undefined : 'square'}
          variant="soft"
          color="neutral"
          onClick={handleToggleFilterPanel}
          sx={{ ml: 'auto', gap: 0.5, flexShrink: 0 }}
        >
          <IconifyIcon
            icon="material-symbols:filter-alt-outline"
            sx={{ fontSize: 20, flexShrink: 0 }}
          />
          {upSm && <Box component="span">Filter</Box>}
        </Button>
      </Stack>
    </Stack>
  );
};

export default TopSection;
