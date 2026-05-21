import { useState, useEffect } from 'react';
import { 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Checkbox, 
  ListItemText, 
  CircularProgress, 
  Autocomplete, 
  Typography // 🚀 Added missing import
} from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';
import { ADD_NEW_TASK } from '../../../../../reducers/KanbanReducer';
import { useERPUser } from '../../../../../../comDash/src/ui/providers/ERPUserProvider';
import dayjs from 'dayjs';

const AddNewTaskForm = ({ listId, position, handleFormClose }) => {
  const { kanbanDispatch, silentCardRefresh } = useKanbanContext();

  const { displayEmail } = useERPUser();
  
  const [userList, setUserList] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [docNames, setDocNames] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingNames, setLoadingNames] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTask, setNewTask] = useState({
    description: '',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    follow_up_date: new Date().toISOString().split('T')[0],
    assignee: [],
    referenceType: '',
    referenceName: '',
    listId,
  });

  // 1. Fetch Users and Types
  useEffect(() => {
    const initData = async () => {
      try {
        const [userRes, typeRes] = await Promise.all([
          fetch('/api/users/system-users'),
          fetch('/api/frappe/doctypes')
        ]);
        const uJson = await userRes.json();
        const tJson = await typeRes.json();
        
        // 🚀 SAFETY CHECK: Ensure we only set state if the result is an array
        const uData = uJson.message || uJson;
        const tData = tJson.message || tJson;
        
        setUserList(Array.isArray(uData) ? uData : []);
        setDocTypes(Array.isArray(tData) ? tData : []);
      } catch (e) { 
        console.error("Init Fetch Error:", e);
        setUserList([]);
        setDocTypes([]);
      }
      finally { setLoadingUsers(false); setLoadingTypes(false); }
    };
    initData();
  }, []);

  // 2. Fetch Names when Type changes
  useEffect(() => {
    if (!newTask.referenceType) {
      setDocNames([]);
      return;
    }
    const fetchNames = async () => {
      setLoadingNames(true);
      try {
        const res = await fetch(`/api/frappe/names?doctype=${newTask.referenceType}`);
        const nJson = await res.json();
        const nData = nJson.message || nJson;
        
        // 🚀 SAFETY CHECK: Ensure it's an array
        setDocNames(Array.isArray(nData) ? nData : []);
      } catch (e) { 
        console.error("Names Fetch Error:", e);
        setDocNames([]);
      }
      finally { setLoadingNames(false); }
    };
    fetchNames();
  }, [newTask.referenceType]);

  const handleChange = (name, value) => {
    if (name === 'referenceType') {
      setNewTask(prev => ({ ...prev, [name]: value, referenceName: '' }));
    } else {
      setNewTask(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newTask.description || !newTask.dueDate) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/frappe/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           ...newTask,
           assignedBy: displayEmail
        })
      });

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save to ERPNext");
      }

      // 🚀 THE FIX: Close the modal and brute-force reload the page
      handleFormClose();
      window.location.reload(); 

    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save task to ERPNext: " + error.message);
      setIsSubmitting(false); // Only stop loading if there's an error
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="column" spacing={2}>
        {/* <TextField label="Task Title" variant="outlined" size="small" fullWidth value={newTask.title} onChange={(e) => handleChange('title', e.target.value)} required /> */}
        
        <TextField label="Description" variant="outlined" size="small" multiline rows={2} fullWidth value={newTask.description} onChange={(e) => handleChange('description', e.target.value)} required />

        <FormControl fullWidth size="small">
          <InputLabel>Priority</InputLabel>
          <Select value={newTask.priority} onChange={(e) => handleChange('priority', e.target.value)} label="Priority">
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>

        <TextField label="Due Date" type="date" variant="outlined" size="small" fullWidth value={newTask.dueDate} onChange={(e) => handleChange('dueDate', e.target.value)} InputLabelProps={{ shrink: true }} required/>
        <TextField label="Follow Up Date" type="date" variant="outlined" size="small" fullWidth value={newTask.follow_up_date} onChange={(e) => handleChange('follow_up_date', e.target.value)} InputLabelProps={{ shrink: true }} />
        {/* --- Searchable Reference Type --- */}
        <Autocomplete
          options={docTypes}
          loading={loadingTypes}
          getOptionLabel={(option) => option?.name || ""}
          // 🚀 DEFENSIVE: Ensure docTypes is an array before calling .find
          value={(Array.isArray(docTypes) ? docTypes : []).find(t => t.name === newTask.referenceType) || null}
          onChange={(event, newValue) => handleChange('referenceType', newValue?.name || '')}
          renderInput={(params) => (
            <TextField {...params} label="Reference Type" size="small" 
              InputProps={{ ...params.InputProps, endAdornment: (
                <> {loadingTypes ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment} </>
              )}} 
            />
          )}
        />

        {/* --- Searchable Reference Name --- */}
        <Autocomplete
          options={docNames}
          loading={loadingNames}
          disabled={!newTask.referenceType}
          getOptionLabel={(option) => {
            if (!option) return "";
            // 🚀 CATCH-ALL: Look for any of the common name fields ERPNext uses
            const label = option.lead_name || option.customer_name || option.subject || option.project_name || option.employee_name || option.first_name || option.full_name || option.title || "";
            return label ? `${option.name} - ${label}` : option.name;
          }}
          value={(Array.isArray(docNames) ? docNames : []).find(n => n.name === newTask.referenceName) || null}
          onChange={(event, newValue) => handleChange('referenceName', newValue?.name || '')}
          noOptionsText={newTask.referenceType ? "No records found" : "Select a type first"}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props;
            // 🚀 CATCH-ALL for the dropdown UI
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
            <TextField {...params} label="Reference Name" size="small" placeholder="Search by ID or Name"
              InputProps={{ ...params.InputProps, endAdornment: (
                  <> {loadingNames ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment} </>
              )}} 
            />
          )}
        />

        {/* --- Multi-Select Assignee --- */}
        <FormControl fullWidth size="small">
          <InputLabel>Assigned To</InputLabel>
          <Select multiple value={newTask.assignee} onChange={(e) => handleChange('assignee', e.target.value)} label="Assignee" renderValue={(selected) => `${selected.length} Selected`}>
            {userList.map((user) => (
              <MenuItem key={user.name} value={user.name}>
                <Checkbox checked={newTask.assignee.indexOf(user.name) > -1} size="small" />
                <ListItemText primary={user.full_name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" type="submit" fullWidth disabled={newTask.title === '' || isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Add Task'}
        </Button>
        <Button variant="outlined" color="inherit" onClick={handleFormClose} fullWidth>Cancel</Button>
      </Stack>
    </Box>
  );
};

export default AddNewTaskForm;