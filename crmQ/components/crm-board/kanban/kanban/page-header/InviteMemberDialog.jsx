import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  dialogClasses,
  DialogContent,
  inputBaseClasses,
  MenuItem,
  selectClasses,
  Stack,
  TextField,
  Typography,
  CircularProgress // Added for loading state
} from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import StyledSelect from 'components/styled/StyledSelect';
import StyledTextField from 'components/styled/StyledTextField';
import { useERPUser } from '../../../../../../comDash/src/ui/providers/ERPUserProvider'

// 🚀 IMPORT YOUR ILLUSTRATED AVATAR
import IllustratedAvatar from '../../../IllustratedAvatar'; // Adjust this path to wherever you saved IllustratedAvatar.jsx!

// Note: We added an 'onConfirm' prop here so the parent component can get the selected users!
const InviteMemberDialog = ({ open, handleClose, onConfirm, taskDetails }) => {
  const [erpUsers, setErpUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 THE FIX: Add the isSaving state definition
  const [isSaving, setIsSaving] = useState(false); 
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Use optional chaining or fallback context if useERPUser isn't perfectly wired yet
  const erpUserContext = useERPUser ? useERPUser() : { displayEmail: 'Administrator' };
  const displayEmail = erpUserContext?.displayEmail || 'Administrator';

  // 🚀 FETCH REAL ERPNEXT USERS
  useEffect(() => {
    if (!open) return; // Only fetch when the dialog is opened

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/users/system-users');
        const data = await res.json();
        setErpUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [open]);

  const handleConfirmClick = async () => {
    if (selectedUsers.length === 0) {
      handleClose();
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/frappe/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskDetails?.title || "Task Follow-up",
          description: taskDetails?.description || "",
          priority: taskDetails?.priority || "medium",
          dueDate: taskDetails?.dueDate || new Date().toISOString(),
          assignee: selectedUsers.map(user => user.name),
          
          // 🚀 THE FIX: Link the new ToDo to the correct Lead!
          referenceType: taskDetails?.referenceType,
          referenceName: taskDetails?.referenceName,
          assignedBy: displayEmail
        })
      });

      if (!res.ok) throw new Error("Failed to assign to ERPNext");

      if (onConfirm) {
        onConfirm(selectedUsers); // Send the successful users back to the UI
      }
      handleClose();
    } catch (error) {
      console.error("Assign Error:", error);
      alert("Failed to create ToDo in ERPNext.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={{
        [`& .${dialogClasses.paper}`]: {
          width: 1,
          maxWidth: 492,
          borderRadius: 6,
        },
      }}
    >
      <DialogContent sx={{ p: 3, pb: { xs: 2, sm: 3 } }}>
        <Stack sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <Typography variant="h6">Invite members</Typography>
          <Button variant="text" color="neutral" size="small" shape="square" onClick={handleClose}>
            <IconifyIcon
              icon="material-symbols:close-rounded"
              sx={{ fontSize: 18, pointerEvents: 'none' }}
            />
          </Button>
        </Stack>
        
        <Stack gap={1} mb={2} direction={{ xs: 'column', sm: 'row' }}>
          <Autocomplete
            multiple
            id="users-autocomplete"
            options={erpUsers}
            loading={loading}
            value={selectedUsers}
            onChange={(event, newValue) => setSelectedUsers(newValue)}
            // ERPNext 'full_name' is the readable name, 'name' is usually the email ID
            getOptionLabel={(option) => option.full_name || option.name} 
            popupIcon={null}
            isOptionEqualToValue={(option, value) => option.name === value.name}
            clearIcon={null}
            sx={{ width: 1 }}
            renderValue={(selectedOptions, getItemProps) =>
              selectedOptions.map((option, index) => (
                <Chip
                  label={option.full_name || option.name}
                  {...getItemProps({ index })}
                  key={option.name}
                  avatar={
                    // 🚀 USE ILLUSTRATED AVATAR IN CHIPS
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden' }}>
                      <IllustratedAvatar name={option.name} size={24} />
                    </Box>
                  }
                />
              ))
            }
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Stack
                  gap={1}
                  key={key}
                  component="li"
                  sx={{ '& > div': { mr: 2, flexShrink: 0 } }} // Target the Box instead of img
                  {...optionProps}
                >
                  {/* 🚀 USE ILLUSTRATED AVATAR IN DROPDOWN LIST */}
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden' }}>
                    <IllustratedAvatar name={option.name} size={24} />
                  </Box>
                  <Typography sx={{ lineClamp: 1 }}>{option.full_name || option.name}</Typography>
                </Stack>
              );
            }}
            renderInput={(params) => (
              <StyledTextField
                {...params}
                autoFocus
                fullWidth
                placeholder="Add user"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{
                  [`& .${inputBaseClasses.root}`]: {
                    px: '8px !important',
                  },
                }}
              />
            )}
          />

          {/* <StyledSelect
            variant="filled"
            defaultValue="Member"
            MenuProps={{
              slotProps: {
                list: {
                  dense: true,
                },
              },
            }}
            sx={{
              minWidth: 100,
              [`& .${selectClasses.icon}`]: { right: 8 },
            }}
          >
            <MenuItem value="Member">Member</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Guest">Guest</MenuItem>
          </StyledSelect> */}
        </Stack>
        {/* <TextField fullWidth multiline rows={3} label="Write a short message (optional)" /> */}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        {/* <Button
          startIcon={<IconifyIcon icon="material-symbols:link-rounded" />}
          sx={{ flexShrink: 0 }}
        >
          Create & copy link
        </Button> */}
        <Box sx={{ ml: 'auto !important' }}>
          <Button color="neutral" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirmClick} autoFocus disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default InviteMemberDialog;