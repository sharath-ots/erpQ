import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useKanbanContext } from '../../../../../../providers/KanbanProvider';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';         // 🚀 MUST IMPORT
import DialogContent from '@mui/material/DialogContent'; // 🚀 MUST IMPORT
import { getFileExtension, getFileIcon } from 'lib/utils';
import Attachment from './Attachment';
import FileUploadArea from './FileUploadArea';

const Attachments = () => {
  const { watch, setValue } = useFormContext();
  const { taskDetails } = useKanbanContext();
  const [isLoading, setIsLoading] = useState(false);
  const [fullView, setFullView] = useState(null); // This state works now!

  const attachments = watch('attachments') || [];
  
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

  const handleDeleteAttachment = async (file_url) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this file?");
    if (!confirm) return;
    try {
      const res = await fetch('/api/frappe/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erp_ids: erpIds, file_url: file_url })
      });
      if (!res.ok) throw new Error("Failed to delete");
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
            <Box key={item.id} sx={{ position: 'relative', mb: 2 }}>
               <Box 
                 onClick={() => item.image && setFullView(item.image)} 
                 sx={{ cursor: item.image ? 'pointer' : 'default' }}
               >
                 <Attachment data={item} />
               </Box>
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
      
      <FileUploadArea erpIds={erpIds} /> 

      {/* 🚀 THE MISSING PIECE: The Dialog component that actually displays the view */}
      <Dialog 
        open={!!fullView} 
        onClose={() => setFullView(null)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {fullView && (
            <img 
              src={fullView} 
              alt="Full screen preview" 
              style={{ width: '100%', height: 'auto', maxHeight: '90vh', objectFit: 'contain' }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default Attachments;