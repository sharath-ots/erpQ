import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';
import { TASK_DETAILS_CLOSE } from '../../../../../reducers/KanbanReducer';
import TaskDetailsHeader from './TaskDetailsHeader';
import TaskSummary from './TaskSummary';
import Activity from './activity/Activity';
import Attachments from './attachments/Attachments';
import CheckList from './check-list/CheckList';
import CoverImage from './cover-image/CoverImage';
import Description from './description/Description';
import CircularProgress from '@mui/material/CircularProgress';
import dayjs from 'dayjs'; // 🚀 Added dayjs to format the date

const TaskDetails = () => {
  const { taskDetails, kanbanDispatch } = useKanbanContext();
  const [isSaving, setIsSaving] = useState(false); // 🚀 Loading state for the save button

  const initialData = {
    ...taskDetails,
    priority: taskDetails?.priority ?? '',
    category: taskDetails?.label ?? '',
    attachments: taskDetails?.attachments ?? [],
    subtasks: taskDetails?.subtasks ?? [],
    referenceType: taskDetails?.referenceType || '', 
    referenceName: taskDetails?.referenceName || '',
    assignedBy: taskDetails?.assignedBy || '',

  };

  const methods = useForm({
    defaultValues: initialData,
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    reset(initialData);
  }, [taskDetails, methods]);

  const handleDiscartChanges = () => {
    reset(initialData);
    kanbanDispatch({ type: TASK_DETAILS_CLOSE });
  };

  const onSubmit = async (data) => {
    
    const pendingAttachments = data.attachments.filter(a => a.file instanceof File);
    
    if (pendingAttachments.length > 0) {
        setIsSaving(true);
        for (const attachment of pendingAttachments) {
            try {
                const formData = new FormData();
                formData.append('file', attachment.file);
                formData.append('doctype', 'ToDo');
                formData.append('docnames', JSON.stringify(taskDetails.erp_ids));
                formData.append('is_private', 1);

                const res = await fetch('/api/frappe/upload', { method: 'POST', body: formData });
                const result = await res.json();
                
                if (!result.success) throw new Error(`Failed to upload ${attachment.filename}`);
            } catch (err) {
                console.error(err);
                alert(`Error uploading ${attachment.filename}`);
                setIsSaving(false);
                return; // Stop here if upload fails
            }
        }
    }

    if (!taskDetails.erp_ids || taskDetails.erp_ids.length === 0) {
        alert("Cannot update: No ERPNext IDs attached to this task. (Was it created manually?)");
        return;
    }

    // 1. COMPARE PREVIOUS DATA (Dirty Checking)
    const hasTitleChanged = data.title !== initialData.title;
    const hasDescChanged = data.description !== initialData.description;
    const hasPriorityChanged = data.priority !== initialData.priority;
    
    // Format dates to simple YYYY-MM-DD for accurate comparison
    const newDate = data.dueDate ? dayjs(data.dueDate).format('YYYY-MM-DD') : null;
    const oldDate = initialData.dueDate ? dayjs(initialData.dueDate).format('YYYY-MM-DD') : null;
    const hasDateChanged = newDate !== oldDate;

    const newFollowDate = data.follow_up_date ? dayjs(data.follow_up_date).format('YYYY-MM-DD') : null;
    const oldFollowDate = initialData.follow_up_date ? dayjs(initialData.follow_up_date).format('YYYY-MM-DD') : null;
    const hasFollowDateChanged = newFollowDate !== oldFollowDate;

    // 2. IF NOTHING CHANGED, DO NOTHING!
    if (!hasTitleChanged && !hasDescChanged && !hasPriorityChanged && !hasDateChanged && !hasFollowDateChanged) {
        kanbanDispatch({ type: TASK_DETAILS_CLOSE });
        return; // Saves an API call entirely!
    }

    setIsSaving(true);

    try {
      // 3. BUILD THE CLEAN PAYLOAD
      const updatedFields = {};
      
      // If Title OR Description changed, we send BOTH so the backend can combine them cleanly
      if (hasTitleChanged || hasDescChanged) {
          updatedFields.title = data.title || '';
          updatedFields.description = data.description || '';
      }
      
      if (hasPriorityChanged) updatedFields.priority = data.priority;
      if (hasDateChanged) updatedFields.dueDate = newDate;
      if (hasFollowDateChanged) updatedFields.follow_up_date = newFollowDate;

      // 4. Send to our PUT endpoint
      const res = await fetch('/api/frappe/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp_ids: taskDetails.erp_ids,
          ...updatedFields // 🚀 Only sending exactly what needs to be updated!
        })
      });

      const responseData = await res.json();

      if (!res.ok) {
          throw new Error(responseData.error || "Failed to update ERPNext");
      }
      
      // 5. Update the Kanban UI & close the drawer
      kanbanDispatch({
         type: 'EDIT_TASK', 
         payload: { ...taskDetails, ...updatedFields } // Update UI instantly
      });
      kanbanDispatch({ type: TASK_DETAILS_CLOSE });

    } catch (error) {
      console.error("Save Error Details:", error);
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <Drawer
        open={!!taskDetails}
        onClose={() => kanbanDispatch({ type: TASK_DETAILS_CLOSE })}
        anchor="right"
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleSubmit(onSubmit),
          },
        }}
        sx={{
          [`& .${drawerClasses.paper}`]: {
            width: { xs: 375, md: 650 },
            overflowX: 'hidden',
          },
        }}
      >
        <TaskDetailsHeader />
        {/* <CoverImage /> */}
        <TaskSummary />
        <Description />
        <Attachments />
        {/* <CheckList /> */}
        <Activity />
        <Stack sx={{ gap: 1, px: { xs: 3, md: 5 }, py: 3, justifyContent: 'flex-end', flexDirection: 'row' }}>
          <Button variant="soft" color="neutral" onClick={handleDiscartChanges} disabled={isSaving}>
            Discard
          </Button>
          <Button variant="contained" type="submit" disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
          </Button>
        </Stack>
      </Drawer>
    </FormProvider>
  );
};

export default TaskDetails;