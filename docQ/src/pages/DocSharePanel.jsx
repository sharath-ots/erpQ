"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";
import DocEmailSelect from "./DocEmailSelect";

// MUI Imports
import {
  Avatar,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";

const PERMISSION_LABEL = {
  read: { label: "Viewer", color: "info" },
  write: { label: "Editor", color: "warning" },
  approve: { label: "Approver", color: "success" },
};

function initialFor(email) {
  const s = String(email || "?").trim();
  return s ? s[0].toUpperCase() : "?";
}

export default function DocSharePanel({ items = [], open, onClose, onChanged }) {
  const [shares, setShares] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      granteeEmail: "",
      permission: "read",
    },
  });

  const isSingleItem = items.length === 1;
  const singleItem = isSingleItem ? items[0] : null;

  const load = useCallback(async () => {
    if (!isSingleItem || !singleItem?.id) {
      setShares([]);
      return;
    }
    setLoading(true);
    try {
      const basePath = singleItem.type === "folder" ? `/scratch/folders/${singleItem.id}` : `/documents/${singleItem.id}`;
      const res = await apiFetch(docPath(`${basePath}/shares`));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.detail || `Server error: ${res.status}`);
      setShares(json.shares || []);
    } catch (e) {
      alert(`Failed to load permissions: ${e.message}`); 
    } finally {
      setLoading(false);
    }
  }, [items, isSingleItem, singleItem]);

  useEffect(() => {
    if (!open) return;
    load();
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then(r => r.json())
      .then(j => setUsers(j.users || []))
      .catch(() => {});
  }, [open, load]);

  async function addShare(values) {
    if (!items.length) return;
    setAdding(true);
    let successCount = 0;
    try {
      for (const item of items) {
        const basePath = item.type === "folder" ? `/scratch/folders/${item.id}` : `/documents/${item.id}`;

        const res = await apiFetch(docPath(`${basePath}/shares`), {
          method: "POST",
          body: JSON.stringify({ 
            granteeEmail: values.granteeEmail, 
            permission: values.permission || "read",
            folderName: item.name || item.title || item.folder_name || item.attributes?.name || "Shared Folder"
          }),
        });
        
        const json = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          throw new Error(json.error || json.detail || `Server error: ${res.status}`);
        }
        successCount++;
      }
      
      alert(`Successfully shared ${successCount} item(s)`); 
      reset(); // clear form
      await load();
      onChanged?.();
      if (!isSingleItem) onClose(); 
    } catch (e) {
      alert(`Sharing failed: ${e.message}`);
    } finally {
      setAdding(false);
    }
  }

  async function removeShare(shareId) {
    if (!isSingleItem) return;
    if (!window.confirm("Are you sure you want to remove this access?")) return; 

    try {
      const basePath = singleItem.type === "folder" ? `/scratch/folders/${singleItem.id}` : `/documents/${singleItem.id}`;
      const res = await apiFetch(docPath(`${basePath}/shares/${shareId}`), { method: "DELETE", body: JSON.stringify({}) });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.detail || `Server error: ${res.status}`);
      }
      await load();
      onChanged?.();
    } catch (e) {
      alert(`Failed to remove access: ${e.message}`);
    }
  }

  return (
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={onClose} 
      // FIXED: Width scales dynamically to ~35-40% of the screen on desktop.
      PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: '40vw', lg: '35vw' }, minWidth: 400, p: 0 } }}
    >
      {/* Drawer Header */}
      <Box sx={{ p: { xs: 3, md: 4 }, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>
          {isSingleItem ? "Share Document" : `Share ${items.length} items`}
        </Typography>
        <Button onClick={onClose} color="inherit" sx={{ minWidth: 0, p: 1 }}>
          <IconifyIcon icon="material-symbols:close-rounded" />
        </Button>
      </Box>

      {/* Drawer Body - Added generous padding */}
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Box component="form" onSubmit={handleSubmit(addShare)} noValidate sx={{ mb: 5 }}>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Add People</Typography>
            <Controller
              name="granteeEmail"
              control={control}
              rules={{ required: "Please enter an email address." }}
              render={({ field: { value, onChange } }) => (
                <Box>
                  <DocEmailSelect 
                    initialUsers={users} 
                    placeholder="Add people by email..." 
                    value={value}
                    onChange={onChange}
                    style={{ width: "100%" }} 
                  />
                  {errors.granteeEmail && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {errors.granteeEmail.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Box>

          <Stack direction="row" spacing={3} alignItems="flex-end">
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Access Level</Typography>
              <Controller
                name="permission"
                control={control}
                render={({ field }) => (
                  <StyledTextField {...field} select fullWidth size="medium">
                    <MenuItem value="read">Viewer</MenuItem>
                    <MenuItem value="write">Editor</MenuItem>
                    <MenuItem value="approve">Approver</MenuItem>
                  </StyledTextField>
                )}
              />
            </Box>
            <Button type="submit" variant="contained" color="primary" disabled={adding} sx={{ height: 48, px: 4, fontWeight: 600 }}>
              {adding ? "Sharing..." : "Share"}
            </Button>
          </Stack>
        </Box>

        {isSingleItem && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
              People with access
            </Typography>
            
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <IconifyIcon icon="line-md:loading-twotone-loop" sx={{ fontSize: 36, color: 'text.secondary' }} />
              </Box>
            ) : !shares.length ? (
              <Box sx={{ textAlign: 'center', py: 5, bgcolor: 'background.default', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                <IconifyIcon icon="material-symbols:lock-outline-rounded" sx={{ fontSize: 36, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>Only you have access</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {shares.map((s) => {
                  const perm = PERMISSION_LABEL[s.permission] || { label: s.permission, color: "default" };
                  const who = s.grantee_email || "—";
                  
                  return (
                    <ListItem 
                      key={s.id} 
                      disableGutters 
                      sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
                      secondaryAction={
                        <IconButton edge="end" aria-label="delete" color="error" onClick={() => removeShare(s.id)} size="small" sx={{ bgcolor: 'error.lighter' }}>
                          <IconifyIcon icon="material-symbols:person-remove-outline-rounded" />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700, width: 42, height: 42 }}>
                          {initialFor(who)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={<Typography variant="body1" fontWeight={600} noWrap sx={{ pr: 2 }}>{who}</Typography>}
                        secondary={<Chip label={perm.label} color={perm.color} size="small" variant="soft" sx={{ mt: 1, fontWeight: 600 }} />} 
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}