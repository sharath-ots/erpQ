import { useFormContext } from 'react-hook-form';
import { getFileExtension, getFileIcon } from 'lib/utils';
import FileDropZone from 'components/base/FileDropZone';

const createAttachmentFromFile = (file) => {
  const isImage = file.type.startsWith('image/');
  const ext = getFileExtension(file.name).toLowerCase();
  return {
    id: `${file.name}-${Date.now()}`,
    filename: file.name,
    time: new Date().toISOString().slice(0, 19),
    addedBy: 'Sampro',
    file, // This 'file' object is what we check in TaskDetails to see if it's new
    ...(isImage && { image: URL.createObjectURL(file) }),
    ...(!isImage && { icon: getFileIcon(ext) }),
  };
};

// 🚀 Removed erpIds prop
const FileUploadArea = () => {
  const { formState: { errors }, setValue, watch } = useFormContext();
  const files = watch('attachments') || [];
  
  // 🚀 CLEAN: onDrop is now synchronous and only updates the form state
  const onDrop = (acceptedFiles) => {
    const uploadedFiles = acceptedFiles.map(createAttachmentFromFile);
    setValue('attachments', [...uploadedFiles, ...files], { shouldValidate: true });
  };

  const removeImage = (dropZoneIndex) => {
    // Note: We need to filter by the specific index to match the FileDropZone UI
    const newFiles = files.filter((_, i) => i !== dropZoneIndex);
    setValue('attachments', newFiles, { shouldValidate: true });
  };

  return (
    <FileDropZone
      multiple
      defaultFiles={files.filter(a => a.file).map(a => a.file)}
      accept={{
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.avif', '.webp'],
        'video/*': ['.mp4', '.mov'],
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/msword': ['.doc'],
        'application/zip': ['.zip'],
      }}
      onDrop={onDrop}
      onRemove={removeImage}
      error={errors?.attachments?.message}
      previewType="thumbnail"
      sx={{ px: { xs: 0, md: 2 }, height: { xs: 'auto', md: 60 } }}
    />
  );
};

export default FileUploadArea;