"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";
import { displayStatus, formatDate } from "./docStatus";

// MUI Imports
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Typography,
  Divider
} from "@mui/material";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";

function formatTags(tags) {
  if (!tags) return "—";
  if (Array.isArray(tags)) return tags.length ? tags.join(", ") : "—";
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) && parsed.length ? parsed.join(", ") : "—";
  } catch {
    return String(tags);
  }
}

function tagsEqual(a, b) {
  const aa = Array.isArray(a) ? a.map(String) : [];
  const bb = Array.isArray(b) ? b.map(String) : [];
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

const DocMetadataPanel = forwardRef(function DocMetadataPanel(
  { documentId, data, onUpdated },
  ref,
) {
  const [docTypes, setDocTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const doc = data?.document;
  const canEdit = Boolean(data?.authorCanEdit);

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      docType: "",
      description: "",
      department: "",
      classification: "",
      referenceNumber: "",
      tags: [],
    },
  });

  useEffect(() => {
    apiFetch(docPath("/doc-types"))
      .then((r) => r.json())
      .then((j) => setDocTypes(j.docTypes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!doc) return;
    let tags = doc.tags;
    if (typeof tags === "string") {
      try { tags = JSON.parse(tags); } catch { tags = []; }
    }
    reset({
      title: doc.title || "",
      docType: doc.doc_type || "",
      description: doc.description || "",
      department: doc.department || "",
      classification: doc.classification || "",
      referenceNumber: doc.reference_number || "",
      tags: Array.isArray(tags) ? tags : [],
    });
  }, [doc, reset]);

  function isDirty(values) {
    if (!doc) return false;
    let docTags = doc.tags;
    if (typeof docTags === "string") {
      try { docTags = JSON.parse(docTags); } catch { docTags = []; }
    }
    return (
      String(values.title || "") !== String(doc.title || "") ||
      String(values.docType || "") !== String(doc.doc_type || "") ||
      String(values.description || "") !== String(doc.description || "") ||
      String(values.department || "") !== String(doc.department || "") ||
      String(values.classification || "") !== String(doc.classification || "") ||
      String(values.referenceNumber || "") !== String(doc.reference_number || "") ||
      !tagsEqual(values.tags, docTags)
    );
  }

  async function patchMetadata(values, { silent = false } = {}) {
    const res = await apiFetch(docPath(`/documents/${documentId}`), {
      method: "PATCH",
      body: JSON.stringify({
        title: values.title,
        doc_type: values.docType,
        description: values.description,
        department: values.department,
        classification: values.classification,
        reference_number: values.referenceNumber,
        tags: values.tags,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
    
    if (!silent) alert("Metadata saved successfully");
    onUpdated?.();
    return true;
  }

  async function saveMetadata(values) {
    setSaving(true);
    try { await patchMetadata(values); } 
    catch (e) { alert(String(e.message || e)); } 
    finally { setSaving(false); }
  }

  useImperativeHandle(ref, () => ({
    async flushSave() {
      if (!canEdit || !doc) return { ok: true, saved: false };
      try {
        const isValid = await trigger();
        if (!isValid) return { ok: false, saved: false, error: "Validation failed" };
        
        const values = getValues();
        if (!isDirty(values)) return { ok: true, saved: false };
        
        setSaving(true);
        await patchMetadata(values, { silent: true });
        return { ok: true, saved: true };
      } catch (e) {
        const errMsg = e?.message || "Could not save metadata";
        alert(String(errMsg));
        return { ok: false, saved: false, error: String(errMsg) };
      } finally {
        setSaving(false);
      }
    },
  }));

  async function uploadVersion(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(docPath(`/documents/${documentId}/versions`), {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      
      alert("New version uploaded");
      onUpdated?.();
    } catch (err) { alert(String(err.message || err)); } 
    finally { setUploading(false); e.target.value = null; }
  }

  if (!doc) return null;

  // ----------------------------------------------------------------------
  // READ-ONLY VIEW (Structured Bordered Grid)
  // ----------------------------------------------------------------------
  if (!canEdit) {
    const locked = doc.state === "approved" || doc.state === "archived";

    // Helper to create exact bordered cells for the Spec Sheet Look
    const SpecCell = ({ label, value, cols = 1 }) => (
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderRight: '1px solid', 
        borderColor: 'divider',
        gridColumn: `span ${cols}`,
      }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{value}</Typography>
      </Box>
    );

    return (
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
          Document Details
        </Typography>

        {locked && (
          <Alert 
            severity={doc.state === "approved" ? "success" : "info"} 
            icon={<IconifyIcon icon="material-symbols:lock-outline" />}
            sx={{ borderRadius: 2, mb: 4 }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              {doc.state === "approved" ? "Approved — locked" : "Archived — locked"}
            </Typography>
            <Typography variant="body2">
              This document is finalised. Metadata, files and versions can no longer be changed.
            </Typography>
          </Alert>
        )}

        {/* 
          FIXED: Exact bordered classifications grid.
          Using a clean CSS Grid to guarantee borders align perfectly. 
        */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          borderTop: '1px solid',
          borderLeft: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}>
          <SpecCell label="Title" value={doc.title || "—"} cols={{ xs: 1, sm: 2, md: 4 }} />
          <SpecCell label="Type" value={<span style={{textTransform:'capitalize'}}>{doc.doc_type || "—"}</span>} />
          <SpecCell label="Author" value={doc.author_email || "—"} cols={{ xs: 1, sm: 1, md: 2 }} />
          <SpecCell label="Created" value={formatDate(doc.created_at)} />
          <SpecCell label="Department" value={doc.department || "—"} />
          <SpecCell label="Classification" value={<span style={{textTransform:'capitalize'}}>{doc.classification || "—"}</span>} />
          <SpecCell label="Reference" value={doc.reference_number || "—"} />
          <SpecCell label="Tags" value={formatTags(doc.tags)} />
          
          <Box sx={{ p: 2, borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider', gridColumn: '1 / -1' }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Description</Typography>
            <Typography variant="body2" fontWeight={600}>{doc.description || "—"}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // ----------------------------------------------------------------------
  // EDITABLE VIEW
  // ----------------------------------------------------------------------
  return (
    <Box component="form" onSubmit={handleSubmit(saveMetadata)} noValidate sx={{ width: '100%' }}>
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
        Document Details
      </Typography>

      {doc.state === "changes_requested" && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>Changes requested</Typography>
          <Typography variant="body2">
            Update metadata and upload a revised file, then use Resubmit for review in the action banner above.
          </Typography>
        </Alert>
      )}

      {/* --- EDITABLE METADATA SECTION --- */}
      <Grid container spacing={3}>
        {/* Row 1: Primary Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <StyledTextField
            fullWidth
            label="Title *"
            size="small"
            required
            error={!!errors.title}
            helperText={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller
            name="docType"
            control={control}
            rules={{ required: "Document type is required" }}
            render={({ field }) => (
              <StyledTextField
                {...field}
                select
                fullWidth
                size="small"
                label="Document type *"
                required
                error={!!errors.docType}
                helperText={errors.docType?.message}
              >
                {docTypes.map((t) => (
                  <MenuItem key={t.doc_type} value={t.doc_type}>
                    {t.label || t.doc_type}
                  </MenuItem>
                ))}
              </StyledTextField>
            )}
          />
        </Grid>

        {/* Row 2: Categorization */}
        <Grid size={{ xs: 12, md: 4 }}>
          <StyledTextField fullWidth size="small" label="Department" {...register("department")} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller
            name="classification"
            control={control}
            render={({ field }) => (
              <StyledTextField
                {...field}
                select
                fullWidth
                size="small"
                label="Classification"
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="internal">Internal</MenuItem>
                <MenuItem value="confidential">Confidential</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </StyledTextField>
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StyledTextField fullWidth size="small" label="Reference no." {...register("referenceNumber")} />
        </Grid>

        {/* Row 3: Tags (Full Width to give chips room to breathe) */}
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
                onChange={(event, newValue) => onChange(newValue)}
                renderTags={(val, getTagProps) =>
                  val.map((option, index) => (
                    <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} key={index} />
                  ))
                }
                renderInput={(params) => (
                  <StyledTextField {...params} size="small" label="Tags" placeholder="Add tags" />
                )}
              />
            )}
          />
        </Grid>

        {/* Row 4: Description (Full Width) */}
        <Grid size={{ xs: 12 }}>
          <StyledTextField fullWidth multiline rows={4} label="Description" {...register("description")} />
        </Grid>
      </Grid>

      {/* --- SYSTEM INFORMATION SECTION --- */}
      <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
      
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" gutterBottom>
        System Information
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StyledTextField fullWidth size="small" label="Author" value={doc.author_email || ""} disabled />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StyledTextField fullWidth size="small" label="Created" value={formatDate(doc.created_at)} disabled />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={saving}
          startIcon={saving && <IconifyIcon icon="line-md:loading-twotone-loop" />}
        >
          {saving ? "Saving..." : "Save metadata"}
        </Button>
        
        <Button
          component="label"
          variant="outlined"
          color="primary"
          disabled={uploading}
          startIcon={<IconifyIcon icon="material-symbols:upload-rounded" />}
        >
          {uploading ? "Uploading..." : "Upload new version"}
          <input type="file" hidden onChange={uploadVersion} />
        </Button>
      </Stack>
    </Box>
  );
});

export default DocMetadataPanel;