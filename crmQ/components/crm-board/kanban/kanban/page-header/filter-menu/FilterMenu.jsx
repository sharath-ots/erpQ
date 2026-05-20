'use client';

import { useState } from 'react';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import Button, { buttonClasses } from '@mui/material/Button';
import Menu, { menuClasses } from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import IconifyIcon from 'components/base/IconifyIcon';
import { useKanbanContext } from '../../../../../../providers/KanbanProvider'; // Adjust path if needed!

const filterOptions = [
  { id: 'task', label: 'Task' },
  { id: 'event', label: 'Event' },
  { id: 'lead', label: 'Email / Lead' },
  { id: 'todo', label: 'General ToDo' },
];

const FilterMenu = () => {
  const { activeFilters, setActiveFilters } = useKanbanContext(); // 🚀 Read global state
  const [localFilters, setLocalFilters] = useState(activeFilters); 
  const [anchorEl, setAnchorEl] = useState(null);
  
  const open = Boolean(anchorEl);
  const { up } = useBreakpoints();
  const upXl = up('xl');

  const handleOpen = (event) => {
    setLocalFilters(activeFilters); // Sync the menu when opened
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleToggle = (id) => {
    setLocalFilters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    setActiveFilters(localFilters); // 🚀 Apply filters globally!
    handleClose();
  };

  const handleReset = () => {
    setLocalFilters([]);
    setActiveFilters([]); // Clear everything (Shows All)
    handleClose();
  };

  // If nothing is checked, it implies "All Tasks"
  const isAllSelected = localFilters.length === 0;

  return (
    <>
      <Tooltip title="Filter" disableHoverListener={upXl ? true : false}>
        <Button
          variant={upXl ? 'text' : 'soft'}
          size="medium"
          color="neutral"
          onClick={handleOpen}
          startIcon={<IconifyIcon icon="material-symbols:filter-alt-outline" sx={{ fontSize: '18px !important' }} />}
          sx={[ { flexShrink: 0 }, !upXl && { [`& .${buttonClasses.startIcon}`]: { m: 0 } } ]}
        >
          {upXl && 'Filter'}
          {activeFilters.length > 0 && ` (${activeFilters.length})`}
        </Button>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        sx={{
          mt: 1.5,
          [`& .${menuClasses.paper}`]: { width: 260, borderRadius: 6, p: 2.5 },
        }}
      >
        <FormGroup>
          <FormControlLabel
            control={<Checkbox checked={isAllSelected} onChange={handleReset} />}
            label="All Tasks"
            sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
          />
          {filterOptions.map((option) => (
            <FormControlLabel
              key={option.id}
              control={
                <Checkbox
                  checked={localFilters.includes(option.id)}
                  onChange={() => handleToggle(option.id)}
                />
              }
              label={option.label}
            />
          ))}
        </FormGroup>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button color="neutral" variant="soft" onClick={handleReset} fullWidth>
            Reset
          </Button>
          <Button variant="contained" onClick={handleConfirm} fullWidth>
            Apply
          </Button>
        </Stack>
      </Menu>
    </>
  );
};

export default FilterMenu;