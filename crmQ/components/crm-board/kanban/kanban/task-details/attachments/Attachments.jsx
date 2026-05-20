import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useKanbanContext } from '../../../../../../providers/KanbanProvider';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { getFileExtension, getFileIcon } from 'lib/utils';
import Attachment from './Attachment';
import FileUploadArea from './FileUploadArea';

const Attachments = () => {
  const { watch, setValue } = useFormContext();
  const { taskDetails } = useKanbanContext();
  const [isLoading, setIsLoading] = useState(false);

  const attachments = watch('attachments') || [];
  
  // 🚀 THE FIX: Grab the full array of IDs, and pick the first one for fetching UI data
  const erpIds = taskDetails?.erp_ids || [];
  const fetchId = erpIds[0]; 

  useEffect(() => {
    if (!fetchId) return;
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/frappe/files?doctype=ToDo&docname=${fetchId}`);
        const json = await res.json();
        
        const uniqueFilesMap = new Map();

        (json.data || []).forEach(f => {
            if (!uniqueFilesMap.has(f.file_url)) {
                const ext = getFileExtension(f.file_name).toLowerCase();
                const isImage = ['jpeg', 'jpg', 'png', 'gif', 'avif', 'webp'].includes(ext);
                
                // 🚀 THE FIX: Create the proxy URL here
                const proxyUrl = `/api/frappe/proxy-image?url=${encodeURIComponent(f.file_url)}`;
                
                uniqueFilesMap.set(f.file_url, {
                    id: f.name, 
                    filename: f.file_name,
                    time: f.creation,
                    addedBy: 'ERPNext',
                    file_url: f.file_url,
                    ...(isImage ? { image: proxyUrl } : { icon: getFileIcon(ext) }),
                });
            }
        });

        setValue('attachments', Array.from(uniqueFilesMap.values()));
        
      } catch (error) {
        console.error("Failed to fetch attachments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [fetchId, setValue]);

  // 🚀 THE FIX: Delete based on URL and the array of IDs
  const handleDeleteAttachment = async (file_url) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this file?");
    if (!confirm) return;

    try {
      const res = await fetch('/api/frappe/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erp_ids: erpIds, file_url: file_url }) // Send them all to the backend!
      });

      if (!res.ok) throw new Error("Failed to delete");

      // Instantly remove it from the screen
      setValue('attachments', attachments.filter(a => a.file_url !== file_url));
    } catch (error) {
      alert("Error deleting file.");
    }
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Attachments
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          {attachments.map((item) => (
            <Box key={item.id} sx={{ position: 'relative' }}>
               <Attachment data={item} />
               <Typography 
                 onClick={() => handleDeleteAttachment(item.file_url)}
                 sx={{ 
                   position: 'absolute', top: 5, right: 10, color: 'error.main', 
                   cursor: 'pointer', fontSize: 12, fontWeight: 'bold', zIndex: 10,
                   '&:hover': { textDecoration: 'underline' }
                 }}
               >
                 Remove
               </Typography>
            </Box>
          ))}
        </Box>
      )}
      
      {/* 🚀 Pass the entire array down to the uploader! */}
      <FileUploadArea erpIds={erpIds} /> 
    </Paper>
  );
};

export default Attachments;