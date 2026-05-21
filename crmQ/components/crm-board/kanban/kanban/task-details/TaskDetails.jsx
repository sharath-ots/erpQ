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
import dayjs from 'dayjs'; 

const TaskDetails = () => {
  const { taskDetails, kanbanDispatch, listItems } = useKanbanContext();
  const [isSaving, setIsSaving] = useState(false); 

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
                return; 
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
    
    // 🚀 THE FIX: Check if the references changed!
    const hasRefTypeChanged = data.referenceType !== initialData.referenceType;
    const hasRefNameChanged = data.referenceName !== initialData.referenceName;
    
    const newDate = data.dueDate ? dayjs(data.dueDate).format('YYYY-MM-DD') : null;
    const oldDate = initialData.dueDate ? dayjs(initialData.dueDate).format('YYYY-MM-DD') : null;
    const hasDateChanged = newDate !== oldDate;

    const newFollowDate = data.follow_up_date ? dayjs(data.follow_up_date).format('YYYY-MM-DD') : null;
    const oldFollowDate = initialData.follow_up_date ? dayjs(initialData.follow_up_date).format('YYYY-MM-DD') : null;
    const hasFollowDateChanged = newFollowDate !== oldFollowDate;

    // 2. IF NOTHING CHANGED, DO NOTHING!
    // 🚀 THE FIX: Included the reference checks here
    if (!hasTitleChanged && !hasDescChanged && !hasPriorityChanged && !hasDateChanged && !hasFollowDateChanged && !hasRefTypeChanged && !hasRefNameChanged) {
        kanbanDispatch({ type: TASK_DETAILS_CLOSE });
        return; 
    }

    setIsSaving(true);

    try {
      // 3. BUILD THE CLEAN PAYLOAD
      const updatedFields = {};
      
      if (hasTitleChanged || hasDescChanged) {
          updatedFields.title = data.title || '';
          updatedFields.description = data.description || '';
      }
      
      if (hasPriorityChanged) updatedFields.priority = data.priority;
      if (hasDateChanged) updatedFields.dueDate = newDate;
      if (hasFollowDateChanged) updatedFields.follow_up_date = newFollowDate;

      // 🚀 THE FIX: If references changed, force the UI to forget the old names
      if (hasRefTypeChanged || hasRefNameChanged) {
          updatedFields.referenceType = data.referenceType;
          updatedFields.referenceName = data.referenceName;
          
          // Also set snake_case versions just to be safe
          updatedFields.reference_type = data.referenceType;
          updatedFields.reference_name = data.referenceName;
          
          // Nuke the old cached human names! 
          // This forces TaskCard to fall back to the new ID instantly
          updatedFields.lead_name = null;
          updatedFields.leadName = null;
          updatedFields.subject = null;
          updatedFields.customer_name = null;
          updatedFields.project_name = null;
      }

      // 4. Send to our PUT endpoint
      const res = await fetch('/api/frappe/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp_ids: taskDetails.erp_ids,
          ...updatedFields 
        })
      });

      const responseData = await res.json();

      if (!res.ok) {
          throw new Error(responseData.error || "Failed to update ERPNext");
      }
      
      let currentListId = null;
      if (listItems) {
          for (const list of listItems) {
              const taskIndex = list.tasks.findIndex(t => t.id === taskDetails.id);
              if (taskIndex !== -1) {
                  currentListId = list.id;
                  list.tasks[taskIndex] = { ...taskDetails, ...updatedFields };
                  break;
              }
          }
      }

      // 5. Update the Kanban UI instantly & close the drawer
      kanbanDispatch({
         type: 'EDIT_TASK', 
         payload: { 
             ...taskDetails, 
             ...updatedFields,
             listId: currentListId 
         } 
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