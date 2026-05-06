import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledTextField from 'components/styled/StyledTextField';

const SearchFilterActionBar = ({
  searchPlaceholder,
  searchId,
  onSearchChange,
  onFilterClick,
  actionComponent,
  searchSx,
  sx,
  ...rest
}) => {
  return (
    <Grid
      container
      spacing={2}
      {...rest}
      sx={{
        width: { xs: 1, md: 'auto' },
        justifyContent: { xs: 'flex-start', md: 'flex-end' },
        ...sx,
      }}
    >
      <Grid size={{ xs: 12, sm: 'grow' }}>
        <Stack direction="row" gap={1} alignItems="center" sx={{ width: 1, minWidth: 0 }}>
          <StyledTextField
            type="search"
            placeholder={searchPlaceholder}
            fullWidth
            id={searchId}
            sx={{
              flex: 1,
              minWidth: 0,
              maxWidth: { sm: 350 },
              ml: { md: 'auto' },
              ...searchSx,
            }}
            onChange={onSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconifyIcon icon="material-symbols:search-rounded" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="soft"
            color="neutral"
            startIcon={<IconifyIcon icon="material-symbols:filter-alt-outline" />}
            onClick={onFilterClick}
            sx={{ textWrap: 'nowrap', flexShrink: 0 }}
          >
            Filter
          </Button>
        </Stack>
      </Grid>
      {actionComponent != null ? (
        <Grid size={{ xs: 12, sm: 'auto' }}>{actionComponent}</Grid>
      ) : null}
    </Grid>
  );
};

export default SearchFilterActionBar;
