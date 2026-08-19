"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";

// MUI & Aurora Imports
import {
  Box,
  Button,
  Breadcrumbs,
  Card as MuiCard,
  CardContent,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
// Make sure this path points to your Iconify component correctly!
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon"; 
import { CommonDataGrid } from "../components/common/CustomTable";

// Antd Imports (Kept specifically for Modals/Forms/Upload logic to not break your core functions)
import { Form, Input, Modal, Popconfirm, Select, Upload, message, Progress } from "antd";
import { FolderOpenOutlined, InboxOutlined } from "@ant-design/icons";

import { apiFetch, getAccessToken } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";
//import DocSharePanel from "./DocSharePanel";

function errText(json, res) {
  return [json?.error || res?.statusText, json?.detail, json?.code]
    .filter(Boolean)
    .join(" — ");
}

export default function DocFileRegister() {
  const router = useRouter();
  const [rootId, setRootId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [trail, setTrail] = useState([{ id: null, name: "My Folders" }]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState(null);
  
  // Progress Bar States
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("active");
  const totalBytesRef = useRef(0);
  const loadedBytesRef = useRef({});

  // Sharing & Bulk Actions states
  const [shareItems, setShareItems] = useState([]); 
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sharingBulk, setSharingBulk] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Registering states
  const [registerFile, setRegisterFile] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [registerForm] = Form.useForm();

  const loadFolder = useCallback(async (parentId, nextTrail) => {
    setLoading(true);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    try {
      const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
      const res = await apiFetch(docPath(`/scratch/folders${q}`));
      const json = await res.json();
      if (!res.ok) throw new Error(errText(json, res));
      const root = json.rootId || null;
      const current = json.parentId || root;
      setRootId(root);
      setFolderId(current);
      const folders = (json.folders || []).map((f) => ({ ...f, kind: "folder" }));
      const files = (json.files || []).map((f) => ({ ...f, kind: "file" }));
      setItems([...folders, ...files]);
      if (nextTrail) {
        setTrail(nextTrail);
      } else if (!parentId && root) {
        setTrail([{ id: root, name: "My Folders" }]);
      }
    } catch (e) {
      message.error(String(e.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const MAX_CONCURRENT_UPLOADS = 4;
  const pendingUploads = useRef([]);
  const activeUploadsCount = useRef(0);

  const processUploadQueue = useCallback(() => {
    while (pendingUploads.current.length > 0 && activeUploadsCount.current < MAX_CONCURRENT_UPLOADS) {
      const nextTask = pendingUploads.current.shift();
      activeUploadsCount.current++;

      nextTask().finally(() => {
        activeUploadsCount.current--;
        processUploadQueue();

        if (activeUploadsCount.current === 0 && pendingUploads.current.length === 0) {
          setOverallProgress(100);
          setUploadStatus("success");
          
          setTimeout(() => {
            setUploading(false);
            setUploadModalOpen(false);
            setOverallProgress(0);
            totalBytesRef.current = 0;
            loadedBytesRef.current = {};
            message.success("Upload complete");
            loadFolder(folderId || rootId, trail);
          }, 750);
        }
      });
    }
  }, [folderId, rootId, trail, loadFolder]);

  useEffect(() => {
    loadFolder(null);
    apiFetch(docPath("/doc-types"))
      .then((r) => r.json())
      .then((j) => setDocTypes(j.docTypes || []))
      .catch(() =>
        setDocTypes([
          { doc_type: "general", label: "General" },
          { doc_type: "manual", label: "Manual" },
          { doc_type: "contract", label: "Contract" },
        ]),
      );
    apiFetch(docPath("/projects"))
      .then((r) => r.json())
      .then((j) => setProjects(j.projects || []))
      .catch(() => setProjects([]));
  }, [loadFolder]);

  function openFolder(folder) {
    const next = [...trail, { id: folder.id, name: folder.name || "Folder" }];
    loadFolder(folder.id, next);
  }

  function goToTrail(index) {
    const next = trail.slice(0, index + 1);
    loadFolder(next[next.length - 1]?.id || null, next);
  }

  function goUp() {
    if (trail.length <= 1) return;
    goToTrail(trail.length - 2);
  }

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) {
      message.warning("Enter a folder name");
      return;
    }

    const isDuplicate = items.some((item) => {
      const itemName = String(item.name || item.title || item.dumpTitle || "");
      return item.kind === "folder" && itemName.toLowerCase() === name.toLowerCase();
    });

    if (isDuplicate) {
      Modal.warning({
        title: "Folder already exists",
        content: `A folder named “${name}” already exists in this location. Please choose a different name.`,
        okText: "OK",
        centered: true,
      });
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await apiFetch(docPath("/scratch/folders"), {
        method: "POST",
        body: JSON.stringify({
          name,
          parentId: folderId || rootId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errText(json, res));
      message.success(`Folder “${name}” created`);
      setNewFolderName("");
      setCreateOpen(false);
      loadFolder(folderId || rootId, trail);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setCreatingFolder(false);
    }
  }

  const duplicateWarnings = useRef(new Set());

  function onUpload(file) {
    const isFolderUpload = !!file.webkitRelativePath;
    const topLevelName = isFolderUpload ? file.webkitRelativePath.split('/')[0] : file.name;
    const kind = isFolderUpload ? "folder" : "file";

    const isDuplicate = items.some((item) => {
      const itemName = String(item.name || item.title || item.dumpTitle || "");
      return itemName.toLowerCase() === topLevelName.toLowerCase() && item.kind === kind;
    });

    if (isDuplicate) {
      if (!duplicateWarnings.current.has(topLevelName)) {
        duplicateWarnings.current.add(topLevelName);
        setUploadErrorMessage(`The ${kind} “${topLevelName}” already exists.`);
        setTimeout(() => duplicateWarnings.current.delete(topLevelName), 5000);
      }
      return false; 
    }

    if (!uploading && activeUploadsCount.current === 0 && pendingUploads.current.length === 0) {
      setUploadStatus("active");
      setOverallProgress(0);
      totalBytesRef.current = 0;
      loadedBytesRef.current = {};
    }

    setUploading(true);
    
    totalBytesRef.current += file.size || 0;
    loadedBytesRef.current[file.uid] = 0;

    const uploadTask = async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        if (file.webkitRelativePath) {
          form.append("webkitRelativePath", file.webkitRelativePath);
        }
        if (folderId) {
          form.append("folderId", folderId);
        } else if (rootId) {
          form.append("folderId", rootId);
        }

        const json = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", docPath("/scratch/upload"));

          const token = getAccessToken();
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              loadedBytesRef.current[file.uid] = e.loaded;
              
              const currentTotalLoaded = Object.values(loadedBytesRef.current).reduce((a, b) => a + b, 0);
              let percent = Math.round((currentTotalLoaded / totalBytesRef.current) * 100);
              if (percent >= 100) percent = 99; 
              
              setOverallProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              loadedBytesRef.current[file.uid] = file.size;
              try { resolve(JSON.parse(xhr.responseText)); } catch (err) { resolve({}); }
            } else {
              try {
                const errJson = JSON.parse(xhr.responseText);
                if (xhr.status === 409 || errJson.error === "duplicate") {
                   reject(new Error(`The ${kind} “${topLevelName}” already exists, so it cannot be uploaded.`));
                } else {
                   reject(new Error(errJson.detail || errJson.error || xhr.statusText));
                }
              } catch (err) {
                reject(new Error(xhr.statusText));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network Error"));
          xhr.send(form);
        });

        return json;
      } catch (e) {
        setUploadStatus("exception");
        setUploadErrorMessage(e.message || `Failed to upload “${file.name}”`);
        return null;
      }
    };

    pendingUploads.current.push(uploadTask);
    processUploadQueue();

    return false;
  }

  async function ensureDocument(file) {
    if (file.documentId) return file.documentId;
    const res = await apiFetch(docPath("/scratch/ensure"), {
      method: "POST",
      body: JSON.stringify({
        fileId: file.id,
        folderId: folderId || rootId,
        title: file.name,
        permalink: file.permalink || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(errText(json, res));
    return json.document?.id;
  }

  async function onShare(row) {
    try {
      if (row.kind === "folder") {
        setShareItems([{ id: row.id, title: row.name, type: "folder" }]);
      } else {
        const documentId = await ensureDocument(row);
        setShareItems([{ id: documentId, title: row.dumpTitle || row.name, type: "document" }]);
        loadFolder(folderId || rootId, trail);
      }
    } catch (e) {
      message.error(String(e.message || e));
    }
  }

  async function onShareSelected() {
    setSharingBulk(true);
    try {
      const formattedItems = await Promise.all(
        selectedRows.map(async (row) => {
          if (row.kind === "folder") {
            return { id: row.id, title: row.name, type: "folder" };
          } else {
            const docId = await ensureDocument(row);
            return { id: docId, title: row.dumpTitle || row.name, type: "document" };
          }
        })
      );
      setShareItems(formattedItems);
      loadFolder(folderId || rootId, trail);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setSharingBulk(false);
    }
  }

  async function onDeleteSelected() {
    if (!selectedRows.length) return;
    
    setDeletingBulk(true);
    
    const keysToDelete = new Set(selectedRowKeys);
    setItems((prevItems) => prevItems.filter((item) => !keysToDelete.has(item.id)));

    try {
      const promises = selectedRows.map((row) => {
        const isFolder = row.kind === "folder";
        const endpoint = isFolder 
          ? docPath(`/scratch/folders/${row.id}`) 
          : docPath(`/scratch/files/${row.id}`);

        return apiFetch(endpoint, {
          method: "DELETE",
          body: JSON.stringify({}),
        }).then(async (res) => {
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.detail || json.error || "Delete failed");
          }
        });
      });

      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === "rejected");

      if (failures.length > 0) {
        message.warning(`${results.length - failures.length} deleted, but ${failures.length} failed.`);
      } else {
        message.success(`${selectedRows.length} items deleted successfully`);
      }
    } catch (e) {
      message.error(`Bulk delete error: ${e.message}`);
    } finally {
      setDeletingBulk(false);
      setBulkDeleteOpen(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      loadFolder(folderId || rootId, trail);
    }
  }

  async function onDelete(row) {
    const isFolder = row.kind === "folder";
    const endpoint = isFolder 
      ? docPath(`/scratch/folders/${row.id}`) 
      : docPath(`/scratch/files/${row.id}`);

    setItems((prevItems) => prevItems.filter((item) => item.id !== row.id));

    try {
      const res = await apiFetch(endpoint, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || json.error || "Delete failed");

      message.success(`${isFolder ? "Folder" : "File"} deleted successfully`);
      loadFolder(folderId || rootId, trail);
    } catch (e) {
      message.error(`Delete failed: ${e.message}`);
      loadFolder(folderId || rootId, trail);
    }
  }

  function openRegister(file) {
    if (file.registered && file.managedDocumentId) {
      message.info("Already registered — opening managed document");
      router.push(`/m/docq/documents/${file.managedDocumentId}`);
      return;
    }
    setRegisterFile(file);
    registerForm.setFieldsValue({
      title: file.dumpTitle || file.name || "",
      docType: "general",
      description: undefined,
      projectId: undefined,
    });
  }

  async function submitRegister(values) {
    if (!registerFile) return;
    setRegistering(true);
    try {
      const res = await apiFetch(docPath("/scratch/register"), {
        method: "POST",
        body: JSON.stringify({
          fileId: registerFile.id,
          folderId: folderId || rootId,
          title: values.title,
          docType: values.docType,
          description: values.description || null,
          projectId: values.projectId || null,
          permalink: registerFile.permalink || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.managedDocumentId) {
          message.warning(json.detail || "Already registered");
          router.push(`/m/docq/documents/${json.managedDocumentId}`);
          return;
        }
        throw new Error(errText(json, res));
      }
      message.success("Copied to managed documents — dump file kept");
      setRegisterFile(null);
      registerForm.resetFields();
      loadFolder(folderId || rootId, trail);
      if (json.document?.id) {
        router.push(`/m/docq/documents/${json.document.id}`);
      }
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setRegistering(false);
    }
  }

  const handleSelectionChange = (keys) => {
    setSelectedRowKeys(keys);
    const rows = items.filter(item => keys.includes(item.id));
    setSelectedRows(rows);
  };

  // ----------------------------------------------------------------------
  // Aurora Styled Columns
  // ----------------------------------------------------------------------
  const columns = [
    {
      id: "name",
      label: "Name",
      numeric: false,
      render: (name, row) =>
        row.kind === "folder" ? (
          <Link 
            component="button" 
            variant="body2" 
            underline="hover"
            onClick={(e) => { e.stopPropagation(); openFolder(row); }}
            sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', fontWeight: 500 }}
          >
            <IconifyIcon icon="material-symbols:folder-rounded" sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            {name}
          </Link>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconifyIcon icon="material-symbols:draft-outline-rounded" sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="text.primary">{name}</Typography>
          </Box>
        ),
    },
    {
      id: "kind",
      label: "Type",
      numeric: false,
      render: (_, row) => (
        <Typography variant="body2" color="text.secondary">
          {row.kind === "folder" ? "Folder" : "File"}
        </Typography>
      ),
    },
    {
      id: "registered",
      label: "Status",
      numeric: false,
      render: (_, row) => {
        if (row.kind === "folder") return <Typography variant="body2" color="text.secondary">—</Typography>;
        return row.registered 
          ? <Chip label="Registered" color="success" size="small" variant="soft" /> 
          : <Chip label="Temp" color="default" size="small" variant="soft" />;
      },
    },
    {
      id: "actions",
      label: "Actions",
      numeric: false,
      render: (_, row) => {
        if (row.kind === "folder") {
          return (
            <Stack direction="row" spacing={2} alignItems="center">
              <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); openFolder(row); }}>Open</Link>
              <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); onShare(row); }}>Share</Link>
              <Popconfirm
                title="Delete folder and contents?"
                onConfirm={(e) => { e.stopPropagation(); onDelete(row); }}
                onCancel={(e) => e.stopPropagation()}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Link component="button" variant="body2" underline="hover" color="error" onClick={(e) => e.stopPropagation()}>Delete</Link>
              </Popconfirm>
            </Stack>
          );
        }
        return (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            {row.permalink ? (
              <Link href={row.permalink} target="_blank" rel="noreferrer" variant="body2" underline="hover" onClick={(e) => e.stopPropagation()}>
                Open
              </Link>
            ) : (
              <Typography variant="body2" color="text.disabled">Open</Typography>
            )}
            
            <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); onShare(row); }}>Share</Link>
            
            {row.registered && row.managedDocumentId ? (
              <Link component={NextLink} href={`/m/docq/documents/${row.managedDocumentId}`} variant="body2" underline="hover" onClick={(e) => e.stopPropagation()}>
                View managed
              </Link>
            ) : (
              <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); openRegister(row); }}>Register</Link>
            )}

            <Popconfirm
              title="Delete file?"
              onConfirm={(e) => { e.stopPropagation(); onDelete(row); }}
              onCancel={(e) => e.stopPropagation()}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Link component="button" variant="body2" underline="hover" color="error" onClick={(e) => e.stopPropagation()}>Delete</Link>
            </Popconfirm>
          </Stack>
        );
      },
    },
  ];

  const currentName = trail[trail.length - 1]?.name || "My Folders";
  
  // ----------------------------------------------------------------------
  // Aurora Styled Action Buttons
  // ----------------------------------------------------------------------
  const actionNodeButtons = (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {selectedRowKeys.length > 0 && (
        <>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<IconifyIcon icon="material-symbols:share-outline" />}
            onClick={onShareSelected}
            disabled={sharingBulk}
          >
            Share
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<IconifyIcon icon="material-symbols:delete-outline" />} 
            onClick={() => setBulkDeleteOpen(true)}
          >
            Delete
          </Button>
        </>
      )}
      
      <Button 
        variant="soft" 
        color="secondary" 
        sx={{ minWidth: 0, width: 36, height: 36, p: 0 }}
        onClick={() => loadFolder(folderId, trail)}
      >
        <IconifyIcon icon="material-symbols:refresh-rounded" sx={{ fontSize: 20 }} />
      </Button>
      
      <Button 
        variant="soft" 
        color="primary" 
        sx={{ minWidth: 0, width: 36, height: 36, p: 0 }}
        onClick={() => setCreateOpen(true)} 
        disabled={!folderId && !rootId}
      >
        <IconifyIcon icon="material-symbols:create-new-folder-outline-rounded" sx={{ fontSize: 20 }} />
      </Button>
      
      <Button 
        variant="contained" 
        color="primary" 
        sx={{ minWidth: 0, width: 36, height: 36, p: 0 }}
        onClick={() => setUploadModalOpen(true)} 
        disabled={!folderId && !rootId}
      >
        <IconifyIcon icon="material-symbols:upload-rounded" sx={{ fontSize: 20 }} />
      </Button>
    </Stack>
  );

  // ----------------------------------------------------------------------
  // Aurora Styled Breadcrumbs Node
  // ----------------------------------------------------------------------
  const tableTitleNode = (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {/* Conditionally hide the Up button if at the root */}
      {trail.length > 1 && (
        <Button
          variant="soft"
          color="secondary"
          size="small"
          onClick={goUp}
          startIcon={<IconifyIcon icon="material-symbols:arrow-back-rounded" />}
        >
          Up
        </Button>
      )}

      <Breadcrumbs separator={<IconifyIcon icon="material-symbols:chevron-right-rounded" sx={{ fontSize: 16 }} />}>
        {trail.map((t, i) => {
          const isLast = i === trail.length - 1;
          const content = (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {i === 0 && <IconifyIcon icon="material-symbols:home-outline-rounded" sx={{ fontSize: 18 }} />}
              <Typography 
                variant={isLast ? "subtitle2" : "body2"} 
                fontWeight={isLast ? 600 : 400} 
                color={isLast ? "text.primary" : "text.secondary"}
              >
                {t.name}
              </Typography>
            </Stack>
          );

          return isLast ? (
            <Box key={i}>{content}</Box>
          ) : (
            <Link 
              key={i} 
              component="button" 
              variant="body2" 
              underline="hover" 
              onClick={() => goToTrail(i)}
            >
              {content}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Stack>
  );

  return (
    <MuiCard elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        
        {/* Adjusted Typography Layout to remove excessive empty space */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            All my dump files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse your personal WorkDrive folders. Upload here, then <strong>Register</strong> to copy a file into managed documents (the dump file stays; it is marked Registered so you do not register twice).
          </Typography>
        </Box>

        <CommonDataGrid 
            title={tableTitleNode}
            headCells={columns}
            rows={items}
            loading={loading}
            defaultPageSize={10}
            onRowClick={(row) => row.kind === "folder" ? openFolder(row) : {}}
            actionNode={actionNodeButtons}
            selectedRowKeys={selectedRowKeys}
            onSelectionChange={handleSelectionChange}
        />
        
        {items.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {items.filter(item => item.kind === "folder").length} folder(s) and {items.filter(item => item.kind !== "folder").length} file(s)
            </Typography>
        )}

        {/* Upload Popup Modal */}
        <Modal
          title={`Upload to “${currentName}”`}
          open={uploadModalOpen}
          onCancel={() => {
            if (!uploading) {
              setUploadModalOpen(false);
            }
          }}
          footer={
            <Button variant="outlined" onClick={() => {
              setUploadModalOpen(false);
              setUploading(false);
              setOverallProgress(0);
            }} disabled={uploading}>
              Cancel
            </Button>
          }
          destroyOnClose
        >
          <div style={{ marginTop: 16 }}>
            <Upload.Dragger
              multiple
              beforeUpload={onUpload}
              showUploadList={false}
              disabled={uploading}
              style={{ padding: "24px 0", background: "#fafafa" }}
            >
              <p className="ant-upload-drag-icon" style={{ margin: 0, fontSize: 36, color: '#1677ff' }}>
                <InboxOutlined />
              </p>
              <p className="ant-upload-text" style={{ marginTop: 12 }}>
                Click or drag files here to upload
              </p>
              <p className="ant-upload-hint">
                Supports single or bulk file upload.
              </p>
            </Upload.Dragger>
          </div>

          {uploading && (
            <div style={{ marginTop: 24, padding: "0 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  {overallProgress === 100 ? "Finalizing upload..." : "Uploading batch..."}
                </Typography>
                <Typography variant="body2" color="text.secondary">{overallProgress}%</Typography>
              </div>
              <Progress
                percent={overallProgress}
                status={uploadStatus}
                showInfo={false}
                size={["100%", 10]}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Want to upload an entire folder structure?
            </Typography>
            <Upload
              beforeUpload={onUpload}
              showUploadList={false}
              multiple
              directory
              disabled={uploading}
            >
              <Button variant="outlined" startIcon={<FolderOpenOutlined />} disabled={uploading}>
                Select Folder to Upload
              </Button>
            </Upload>
          </div>
        </Modal>

        {/* New Folder Modal */}
        <Modal
          title={`New folder in “${currentName}”`}
          open={createOpen}
          onOk={createFolder}
          confirmLoading={creatingFolder}
          onCancel={() => {
            setCreateOpen(false);
            setNewFolderName("");
          }}
          okText="Create"
        >
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={createFolder}
          />
        </Modal>

        {/* Register Modal */}
        <Modal
          title="Register into managed documents"
          open={Boolean(registerFile)}
          onCancel={() => {
            setRegisterFile(null);
            registerForm.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates a <strong>copy</strong> in the managed vault. Your dump file stays
            here and will show as Registered.
          </Typography>
          <Form form={registerForm} layout="vertical" onFinish={submitRegister}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="docType" label="Document type" rules={[{ required: true }]}>
              <Select
                options={(docTypes.length
                  ? docTypes
                  : [{ doc_type: "general", label: "General" }]
                ).map((t) => ({
                  value: t.doc_type,
                  label: t.label || t.doc_type,
                }))}
              />
            </Form.Item>
            <Form.Item name="projectId" label="Project (optional)">
              <Select
                allowClear
                placeholder="Managed vault root if empty"
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.name || p.project_key,
                }))}
              />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button variant="contained" color="primary" fullWidth onClick={() => registerForm.submit()} disabled={registering}>
              Copy &amp; register
            </Button>
          </Form>
        </Modal>

        {/* Bulk Delete Confirmation Modal */}
        <Modal
          title={`Delete ${selectedRowKeys.length} items?`}
          open={bulkDeleteOpen}
          onOk={onDeleteSelected}
          confirmLoading={deletingBulk}
          onCancel={() => setBulkDeleteOpen(false)}
          okText="Yes, delete"
          okButtonProps={{ danger: true }}
          centered
        >
          <Typography variant="body1">
            Are you sure you want to delete the selected items?
          </Typography>
        </Modal>

        <Modal
          title={
            <span style={{ color: '#ff4d4f' }}>
              Upload Blocked
            </span>
          }
          open={!!uploadErrorMessage}
          onOk={() => setUploadErrorMessage(null)}
          onCancel={() => setUploadErrorMessage(null)}
          okText="Understood"
          cancelButtonProps={{ style: { display: 'none' } }}
          centered
          zIndex={3000}
        >
          <Typography variant="body1">
            {uploadErrorMessage}
          </Typography>
        </Modal>

        {/* <DocSharePanel
          items={shareItems}
          open={shareItems.length > 0}
          onClose={() => setShareItems([])}
        /> */}
      </CardContent>
    </MuiCard>
  );
}