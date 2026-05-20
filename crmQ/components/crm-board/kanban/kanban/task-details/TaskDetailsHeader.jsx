import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import Button, { buttonClasses } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useBreakpoints } from 'providers/BreakpointsProvider';
import { useKanbanContext } from '../../../../../providers/KanbanProvider';
import { TASK_DETAILS_CLOSE } from '../../../../../reducers/KanbanReducer';
import IconifyIcon from 'components/base/IconifyIcon';

const buttons = [
  // {
  //   icon: 'material-symbols:drive-file-move-outline-rounded',
  //   title: 'Transfer',
  // },
  // {
  //   icon: 'material-symbols:file-copy-outline-rounded',
  //   title: 'Copy',
  // },
  // {
  //   icon: 'material-symbols:share-outline',
  //   title: 'Share',
  // },
  // {
  //   icon: 'material-symbols:move-up-rounded',
  //   title: 'Move Up',
  // },
  {
    icon: 'material-symbols:delete-outline-rounded',
    title: 'Delete',
  },
  // {
  //   icon: 'material-symbols:download-rounded',
  //   title: 'Download',
  // },
];

const TaskDetailsHeader = () => {
  const { taskDetails, kanbanDispatch } = useKanbanContext();
  const { up } = useBreakpoints();
  const upMd = up('md');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    if (!taskDetails?.erp_ids || taskDetails.erp_ids.length === 0) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/frappe/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp_ids: taskDetails.erp_ids,
          status: newStatus 
        })
      });

      if (!res.ok) throw new Error("Failed to update status");

      kanbanDispatch({ type: TASK_DETAILS_CLOSE });
      window.location.reload(); 

    } catch (error) {
      console.error("Status Update Error:", error);
      alert("Error updating task status.");
      setIsUpdating(false); 
    }
  };

  const handleDelete = async () => {
    if (!taskDetails?.erp_ids || taskDetails.erp_ids.length === 0) return;

    const confirmed = window.confirm("Are you sure you want to permanently delete this task? This cannot be undone in ERPNext.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/frappe/todo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp_ids: taskDetails.erp_ids
        })
      });

      if (!res.ok) throw new Error("Failed to delete task");

      kanbanDispatch({ type: TASK_DETAILS_CLOSE });
      window.location.reload(); 

    } catch (error) {
      console.error("Delete Error:", error);
      alert("Error deleting task.");
      setIsDeleting(false); 
    }
  };
  
  return (
    <Stack sx={{ px: { xs: 3, md: 5 }, py: 3, alignItems: 'center', flexDirection: 'row' }}>
      
      <Button
        variant="soft"
        shape={upMd ? undefined : 'square'}
        color="error" 
        size="small"
        startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <IconifyIcon icon="material-symbols:cancel-outline" fontSize="18px !important" />}
        onClick={() => handleStatusUpdate('Cancelled')}
        disabled={isUpdating || isDeleting}
        sx={[
          { borderRadius: 1, mr: 1 },
          !upMd && { [`& .${buttonClasses.startIcon}`]: { m: 0 } },
        ]}
      >
        {upMd && 'Mark Cancelled'}
      </Button>

      <Button
        variant="soft"
        shape={upMd ? undefined : 'square'}
        color="success" 
        size="small"
        startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : <IconifyIcon icon="material-symbols:check-rounded" fontSize="18px !important" />}
        onClick={() => handleStatusUpdate('Closed')}
        disabled={isUpdating || isDeleting}
        sx={[
          { borderRadius: 1 },
          !upMd && { [`& .${buttonClasses.startIcon}`]: { m: 0 } },
        ]}
      >
        {upMd && 'Mark Complete'}
      </Button>

      {/* 🚀 FIXED: Dynamic mapping handles the Delete button state and click! */}
      {buttons.map((item, index) => {
        const isDeleteBtn = item.title === 'Delete';
        return (
          <Tooltip key={item.title} title={item.title}>
            <Button
              variant="soft"
              shape="square"
              color={isDeleteBtn ? 'error' : 'neutral'} // Makes the delete button explicitly red
              size="small"
              disabled={isUpdating || (isDeleteBtn && isDeleting)}
              sx={{ ml: index === 0 ? 'auto' : 1, borderRadius: 1 }}
              onClick={isDeleteBtn ? handleDelete : item.onClick}
            >
              {isDeleteBtn && isDeleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <IconifyIcon icon={item.icon} fontSize={18} />
              )}
            </Button>
          </Tooltip>
        );
      })}

      <Button
        variant="text"
        shape="square"
        color="neutral"
        size="small"
        onClick={() => kanbanDispatch({ type: TASK_DETAILS_CLOSE })}
        disabled={isUpdating || isDeleting}
        sx={{ ml: 1, borderRadius: 1 }}
      >
        <IconifyIcon icon="material-symbols:close-rounded" fontSize={18} />
      </Button>
    </Stack>
  );
};

export default TaskDetailsHeader;