"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// MUI Imports
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

// API Imports (Adjust paths if necessary based on your folder structure)
import { apiFetch, getAccessToken, parseCityQJwtPayload } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";

// ----------------------------------------------------------------------
// 1. Validation Schema
// ----------------------------------------------------------------------
const uploadSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  docType: yup.string().required("Document type is required"),
  projectId: yup.string().nullable(),
  department: yup.string().nullable(),
  classification: yup.string().nullable(),
  referenceNumber: yup.string().nullable(),
  tags: yup.array().of(yup.string()).nullable(),
  description: yup.string().nullable(),
});

// ----------------------------------------------------------------------
// 2. Reusable Form Section Component
// ----------------------------------------------------------------------
const FormSection = ({ title, description, children }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
    <Box sx={{ p: 3, borderRadius: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
      {children}
    </Box>
  </Box>
);

// ----------------------------------------------------------------------
// 3. Main Component
// ----------------------------------------------------------------------
export default function DocNewUpload() {
  const router = useRouter();
  
  // States
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const session = parseCityQJwtPayload(getAccessToken());

  // Form Setup
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(uploadSchema),
    defaultValues: {
      docType: "general",
      tags: [],
    },
  });

  // Fetch Data on Mount
  useEffect(() => {
    // Fetch Doc Types
    apiFetch(docPath("/doc-types"))
      .then((r) => r.json())
      .then((j) => {
        const types = j.docTypes || [];
        setDocTypes(types);
        if (types.length && !getValues("docType")) {
          setValue("docType", types[0].doc_type);
        }
      })
      .catch(() => {
        setDocTypes([
          { doc_type: "general", label: "General" },
          { doc_type: "manual", label: "Manual" },
          { doc_type: "contract", label: "Contract" },
        ]);
      });

    // Fetch Projects
    apiFetch(docPath("/projects"))
      .then((r) => r.json())
      .then((j) => setProjects(j.projects || []))
      .catch(() => setProjects([]));
  }, [setValue, getValues]);

  // Handle File Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileError("");
      
      // Auto-fill title if empty
      if (!getValues("title")) {
        setValue("title", selectedFile.name, { shouldValidate: true });
      }
    }
  };

  // Submit Handler
  const onSubmit = async (values) => {
    if (!file) {
      setFileError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("docType", values.docType);
      uploadForm.append("title", values.title);
      
      if (values.description) uploadForm.append("description", values.description);
      if (values.department) uploadForm.append("department", values.department);
      if (values.classification) uploadForm.append("classification", values.classification);
      if (values.referenceNumber) uploadForm.append("referenceNumber", values.referenceNumber);
      if (values.tags?.length) uploadForm.append("tags", JSON.stringify(values.tags));
      if (values.projectId) uploadForm.append("projectId", values.projectId);

      const res = await apiFetch(docPath("/documents/create-managed"), {
        method: "POST",
        body: uploadForm,
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const detail =
          typeof json.detail === "string"
            ? json.detail
            : json.detail
              ? JSON.stringify(json.detail).slice(0, 200)
              : "";
        throw new Error([json.error || res.statusText, detail].filter(Boolean).join(" — "));
      }
      
      if (!json.document?.id) {
        throw new Error("Document was uploaded but not saved (missing id)");
      }

      alert("Document created — open it and click Submit for review"); 
      router.push(`/m/docq/documents/${json.document.id}`);
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Create New Document
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fill in metadata and attach the file. The document starts as a draft; open it and use <strong>Submit for review</strong> when ready.
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          
          {/* Section 1: File Upload */}
          <FormSection title="Document File" description="Upload the primary file for this document record.">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                sx={{ textTransform: 'none' }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              
              {file ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, pr: 2 }}>
                  <InsertDriveFileIcon color="action" />
                  <Typography variant="body2">{file.name}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No file selected
                </Typography>
              )}
            </Stack>
            {fileError && <FormHelperText error sx={{ mt: 1 }}>{fileError}</FormHelperText>}
          </FormSection>

          {/* Section 2: Primary Details */}
          <FormSection title="Primary Details">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Document Title"
                      required
                      error={!!errors.title}
                      helperText={errors.title?.message}
                      // This forces the label to move up when auto-filled
                      InputLabelProps={{ shrink: field.value ? true : undefined }} 
                    />
                  )}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="docType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.docType}>
                      <InputLabel required>Document Type</InputLabel>
                      <Select {...field} label="Document Type *">
                        {docTypes.map((t) => (
                          <MenuItem key={t.doc_type} value={t.doc_type}>
                            {t.label || t.doc_type}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.docType && <FormHelperText>{errors.docType.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  placeholder="Purpose, scope, or summary"
                  {...register("description")}
                />
              </Grid>
            </Grid>
          </FormSection>

          {/* Section 3: Classification & Metadata */}
          <FormSection title="Classification & Metadata">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Project Context</InputLabel>
                      <Select {...field} label="Project Context" value={field.value || ""}>
                        <MenuItem value="">
                          <em>Managed vault root (None)</em>
                        </MenuItem>
                        {projects.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name || p.project_key}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="classification"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Security Classification</InputLabel>
                      <Select {...field} label="Security Classification" value={field.value || ""}>
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="internal">Internal</MenuItem>
                        <MenuItem value="confidential">Confidential</MenuItem>
                        <MenuItem value="public">Public</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Department"
                  placeholder="e.g. Engineering"
                  {...register("department")}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  placeholder="Optional ID or Tracking No."
                  {...register("referenceNumber")}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="tags"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={value || []}
                      onChange={(event, newValue) => {
                        onChange(newValue);
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip variant="outlined" label={option} {...getTagProps({ index })} key={index} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          placeholder="Type and press Enter to add tags"
                        />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </FormSection>

          {/* Section 4: Author Info */}
          <FormSection title="System Information">
             <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Author"
                    value={session?.email || ""}
                    InputProps={{
                      readOnly: true,
                    }}
                    disabled
                  />
                </Grid>
             </Grid>
          </FormSection>

          {/* Submit Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button 
              variant="outlined" 
              color="inherit" 
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="large"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Draft"}
            </Button>
          </Box>

        </form>
      </CardContent>
    </Card>
  );
}