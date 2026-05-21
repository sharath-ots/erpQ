import { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu'; 
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { boards, taskLabels, taskPriorities } from 'data/kanban/kanban/kanban';
import dayjs from 'dayjs';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';
import IconifyIcon from 'components/base/IconifyIcon';
import BoardMembers from 'components/crm-board/kanban/kanban/page-header/BoardMembers';
import InviteMemberDialog from 'components/crm-board/kanban/kanban/page-header/InviteMemberDialog';
import StyledTextField from 'components/styled/StyledTextField';

const options = [
  { name: 'board', items: boards },
  { name: 'column', items: [] },
  { name: 'label', items: taskLabels },
  { name: 'priority', items: taskPriorities },
];

const TaskSummary = () => {
  const { listItems, taskDetails } = useKanbanContext();
  const { control, setValue, watch } = useFormContext();
  const [isEditing, setIsEditing] = useState(false);
  
  const [isOpenInviteDialog, setIsOpenInviteDialog] = useState(false);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState(null); 

  const title = watch('title');
  const currentAssignees = taskDetails?.assignee || [];
  
  const referenceType = watch('referenceType');
  const [docNames, setDocNames] = useState([]);
  const [loadingNames, setLoadingNames] = useState(false);
  
  // 🚀 ADDED: State to hold the dynamic reference types
  const [docTypes, setDocTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const selectItems = useMemo(
    () =>
      options.map((item) =>
        item.name === 'column' ? { ...item, items: listItems.map((item) => item.title) } : item,
      ),
    [listItems],
  );

  const handleEditClick = () => setIsEditing(true);

  const handleBlur = (value) => {
    if (value.trim() === '') {
      setValue('title', taskDetails?.title);
    }
    setIsEditing(false);
  };

  // 🚀 ADDED: Fetch DocTypes exactly like AddNewTaskForm
  useEffect(() => {
    const fetchDocTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await fetch('/api/frappe/doctypes');
        const tJson = await res.json();
        const tData = tJson.message || tJson;
        setDocTypes(Array.isArray(tData) ? tData : []);
      } catch (error) {
        console.error("Failed to fetch DocTypes:", error);
        setDocTypes([]);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchDocTypes();
  }, []);

  useEffect(() => {
    if (!referenceType) {
      setDocNames([]);
      return;
    }

    const fetchReferenceNames = async () => {
      setLoadingNames(true);
      try {
        const res = await fetch(`/api/frappe/names?doctype=${referenceType}`);
        const nJson = await res.json();
        
        const nData = nJson.message || nJson; 
        
        setDocNames(Array.isArray(nData) ? nData : []);
      } catch (error) {
        console.error(`Failed to fetch names for ${referenceType}:`, error);
        setDocNames([]);
      } finally {
        setLoadingNames(false);
      }
    };

    fetchReferenceNames();
  }, [referenceType]);

  return (
    <Paper sx={{ p: { xs: 3, md: 5 } }}>
      <Stack spacing={1} sx={{ alignItems: 'flex-start', flexDirection: 'row' }}>
        {isEditing ? (
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <StyledTextField
                {...field}
                variant="outlined"
                size="large"
                autoFocus
                onBlur={(e) => handleBlur(e.target.value)}
                fullWidth
              />
            )}
          />
        ) : (
          <>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>{title}</Typography>
            {/* <IconButton onClick={handleEditClick} size="small" sx={{ mt: 0.5 }}>
              <IconifyIcon icon="material-symbols:edit-outline" sx={{ color: 'text.primary', fontSize: 20 }} />
            </IconButton> */}
          </>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Assignee
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
              
              <Box onClick={(e) => setAvatarMenuAnchor(e.currentTarget)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <BoardMembers members={currentAssignees} />
              </Box>

              <Menu
                anchorEl={avatarMenuAnchor}
                open={Boolean(avatarMenuAnchor)}
                onClose={() => setAvatarMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                {currentAssignees.length === 0 ? (
                  <MenuItem disabled>No assignees</MenuItem>
                ) : (
                  currentAssignees.map((user, index) => (
                    <MenuItem key={user.id || index} onClick={() => setAvatarMenuAnchor(null)}>
                      {user.name || user.id}
                    </MenuItem>
                  ))
                )}
              </Menu>

              <Button
                variant="soft"
                shape="circle"
                color="neutral"
                size="small"
                onClick={() => setIsOpenInviteDialog(true)}
                sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
              >
                <IconifyIcon icon="material-symbols:add-2-rounded" color="text.primary" fontSize={18} />
              </Button>

              <InviteMemberDialog
                open={isOpenInviteDialog}
                handleClose={() => setIsOpenInviteDialog(false)}
                taskDetails={taskDetails} 
                onConfirm={() => window.location.reload()}
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="dueDate"
              control={control}
              render={({ field: { onChange, value } }) => (
                <div>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    Due Date
                  </Typography>
                  <DatePicker
                    format="DD MMM, YYYY"
                    defaultValue={value ? dayjs(value) : null}
                    onChange={(date) => onChange(date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </div>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="followUpDate"
              control={control}
              render={({ field: { onChange, value } }) => (
                <div>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    Follow Up Date
                  </Typography>
                  <DatePicker
                    format="DD MMM, YYYY"
                    defaultValue={value ? dayjs(value) : null}
                    onChange={(date) => onChange(date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </div>
              )}
            />
          </Grid>

          {selectItems.map((item) => (
            <Grid key={item.name} size={{ xs: 12, md: 6 }}>
              <Controller
                name={item.name}
                control={control}
                render={({ field }) => (
                  <div>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary', textTransform: 'capitalize' }}>
                      {item.name}
                    </Typography>
                    <StyledTextField
                      {...field}
                      id={`custom-select-${item.name}`}
                      size="medium"
                      select
                      disabled={item.name === 'board' || item.name === 'column' || item.name === 'label'}
                      sx={{ width: 1, textTransform: 'capitalize' }}
                    >
                      {item.items.map((option) => (
                        <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }} dense>
                          {option}
                        </MenuItem>
                      ))}
                    </StyledTextField>
                  </div>
                )}
              />
            </Grid>
          ))}

          {/* 🚀 THE FIX: Swapped out hardcoded array for dynamic Autocomplete */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="referenceType"
              control={control}
              render={({ field: { onChange, value } }) => (
                <div>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    Reference Type
                  </Typography>
                  <Autocomplete
                    options={docTypes}
                    loading={loadingTypes}
                    getOptionLabel={(option) => option?.name || (typeof option === 'string' ? option : "")}
                    value={docTypes.find(t => t.name === value) || value || null}
                    onChange={(event, newValue) => {
                       onChange(newValue ? newValue.name : '');
                       setValue('referenceName', ''); 
                    }}
                    renderInput={(params) => (
                      <StyledTextField 
                        {...params} 
                        size="medium" 
                        placeholder="Select Type"
                        InputProps={{ 
                          ...params.InputProps, 
                          endAdornment: (
                            <> 
                              {loadingTypes ? <CircularProgress color="inherit" size={20} /> : null} 
                              {params.InputProps.endAdornment} 
                            </>
                          )
                        }} 
                      />
                    )}
                  />
                </div>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="referenceName"
              control={control}
              render={({ field: { onChange, value } }) => (
                <div>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    Reference Name
                  </Typography>
                  <Autocomplete
                    options={docNames}
                    loading={loadingNames}
                    disabled={!referenceType}
                    getOptionLabel={(option) => {
                      if (!option) return "";
                      if (typeof option === 'string') return option; 
                      const label = option.lead_name || option.customer_name || option.subject || option.project_name || option.employee_name || option.first_name || option.full_name || option.title || "";
                      return label ? `${option.name} - ${label}` : option.name;
                    }}
                    value={docNames.find(n => n.name === value) || value || null}
                    onChange={(event, newValue) => {
                      onChange(newValue ? newValue.name : ''); 
                    }}
                    noOptionsText={referenceType ? "No records found" : "Select a Reference Type first"}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      const extraInfo = option.lead_name || option.customer_name || option.subject || option.project_name || option.employee_name || option.first_name || option.full_name || option.title;
                      return (
                        <li key={key} {...optionProps}>
                          <Stack spacing={0}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {option.name}
                            </Typography>
                            {extraInfo && (
                              <Typography variant="caption" color="text.secondary">
                                {extraInfo}
                              </Typography>
                            )}
                          </Stack>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <StyledTextField 
                        {...params} 
                        size="medium" 
                        placeholder="Search by ID or Name"
                        InputProps={{ 
                          ...params.InputProps, 
                          endAdornment: (
                            <> 
                              {loadingNames ? <CircularProgress color="inherit" size={20} /> : null} 
                              {params.InputProps.endAdornment} 
                            </>
                          )
                        }} 
                      />
                    )}
                  />
                </div>
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="assignedBy"
              control={control}
              render={({ field }) => (
                <div>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    Assigned By
                  </Typography>
                  <StyledTextField
                    {...field}
                    size="medium"
                    fullWidth
                    disabled={true}
                  />
                </div>
              )}
            />
          </Grid>

        </Grid>
      </Box>
    </Paper>
  );
};

export default TaskSummary;