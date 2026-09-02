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

import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon"; 
import { CommonDataGrid } from "../components/common/CustomTable";

// Antd Imports
import { Form, Input, Modal, Popconfirm, Select, Upload, message, Progress } from "antd";
import { FolderOpenOutlined, InboxOutlined } from "@ant-design/icons";
import { apiFetch, getAccessToken } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";
import DocSharePanel from "./DocSharePanel";

function errText(json, res) {
  return [json?.error || res?.statusText, json?.detail, json?.code]
    .filter(Boolean)
    .join(" | ");
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

  // Rename Modal States
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Reliable Declarative Modal States for Duplicates
  const [pasteWarning, setPasteWarning] = useState(null);
  const [uploadWarning, setUploadWarning] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState(null);
  const [createFolderWarning, setCreateFolderWarning] = useState(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState(null); 

  // Progress Bar & Batch States
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("active");
  const [uploadText, setUploadText] = useState("Preparing upload...");
  
  // Active Uploads State (for better UX during Pause)
  const [activeUploads, setActiveUploads] = useState(0);

  // Pause States
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Smart Dropzone States
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Refs for tracking synchronous batches safely
  const isBatchActive = useRef(false);
  const totalBytesRef = useRef(0);
  const loadedBytesRef = useRef({});
  const totalFilesRef = useRef(0);
  const processedFilesRef = useRef(0);
  const activeXhrs = useRef(new Set()); 

  // Sharing & Bulk Actions states
  const [shareItems, setShareItems] = useState([]); 
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sharingBulk, setSharingBulk] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Clipboard for Cut/Copy/Paste
  const [clipboard, setClipboard] = useState(null);
  const [pasting, setPasting] = useState(false);

  // Refs for keyboard shortcuts (Guarantees event listener uses freshest data)
  const selectedRowsRef = useRef([]);
  const clipboardRef = useRef(null);
  const folderIdRef = useRef(null);
  const rootIdRef = useRef(null);
  const trailRef = useRef([{ id: null, name: "My Folders" }]);
  const itemsRef = useRef([]);

  // Sync refs 
  useEffect(() => { selectedRowsRef.current = selectedRows; }, [selectedRows]);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);
  useEffect(() => { folderIdRef.current = folderId; }, [folderId]);
  useEffect(() => { rootIdRef.current = rootId; }, [rootId]);
  useEffect(() => { trailRef.current = trail; }, [trail]);
  useEffect(() => { itemsRef.current = items; }, [items]);

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

  const MAX_CONCURRENT_UPLOADS = 1; 
  const pendingUploads = useRef([]);
  const activeUploadsCount = useRef(0);

  // 1. THE QUEUE PROCESSOR
  const processUploadQueue = useCallback(() => {
    if (isPausedRef.current) return;
    
    if (activeUploadsCount.current === 0 && pendingUploads.current.length === 0) {
      if (totalBytesRef.current > 0 && isBatchActive.current) {
        setOverallProgress(100);
        setUploadStatus("success");
        setUploadText("Finalizing upload...");
        isBatchActive.current = false; 
        
        setTimeout(() => {
          setUploading(false);
          setUploadModalOpen(false);
          setOverallProgress(0);
          totalBytesRef.current = 0;
          loadedBytesRef.current = {};
          processedFilesRef.current = 0;
          totalFilesRef.current = 0;
          loadFolder(folderId || rootId, trail);
        }, 1000);
      }
      return;
    }

    while (pendingUploads.current.length > 0 && activeUploadsCount.current < MAX_CONCURRENT_UPLOADS) {
      const nextTask = pendingUploads.current.shift(); 
      activeUploadsCount.current++;
      
      nextTask()
        .then(() => {
          activeUploadsCount.current--;
          setTimeout(() => { processUploadQueue(); }, 50); 
        })
        .catch((err) => {
          activeUploadsCount.current--;
          const errMsg = String(err?.message || "");
          
          if (errMsg === "USER_ABORT") {
            return; // Aborted cleanly, do nothing
          }
          else if (
            errMsg.includes("429") || 
            errMsg.includes("Rate Limit") ||
            errMsg.includes("401") ||
            errMsg.includes("500") ||
            errMsg.includes("502") ||
            errMsg.includes("504") ||
            errMsg.includes("Network Error")
          ) {
            setUploadStatus("exception");
            setUploadText("Pausing for 20s to recover from network error...");
            
            pendingUploads.current.unshift(nextTask);
            
            setTimeout(() => {
              setUploadStatus("active");
              processUploadQueue();
            }, 20000);
          } else {
            message.error(`Upload failed: ${errMsg}`);
            setTimeout(() => { processUploadQueue(); }, 50); 
          }
        });
    }
  }, [folderId, rootId, trail, loadFolder]);

  // 2. SMART DROP HANDLER 
  const handleCustomDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const itemsList = e.dataTransfer.items;
    if (!itemsList) return;

    const rawEntries = [];
    for (let i = 0; i < itemsList.length; i++) {
      if (itemsList[i].kind === 'file') {
        const entry = itemsList[i].webkitGetAsEntry ? itemsList[i].webkitGetAsEntry() : null;
        if (entry) {
          rawEntries.push(entry);
        } else {
          const f = itemsList[i].getAsFile();
          if (f) rawEntries.push({ fallbackFile: f });
        }
      }
    }

    const extractedFiles = [];

    const readEntry = async (entry, path = "") => {
      if (entry.fallbackFile) {
        extractedFiles.push(entry.fallbackFile);
      } else if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        file.customRelativePath = path ? path + file.name : file.name; 
        extractedFiles.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readAll = async () => {
          let allEntries = [];
          let read = async () => {
            const chunk = await new Promise((resolve) => dirReader.readEntries(resolve));
            if (chunk.length > 0) {
              allEntries = allEntries.concat(chunk);
              await read();
            }
          };
          await read();
          return allEntries;
        };
        const children = await readAll();
        for (const child of children) {
          await readEntry(child, path + entry.name + "/"); 
        }
      }
    };

    for (const entry of rawEntries) {
      await readEntry(entry);
    }

    if (extractedFiles.length > 0) {
       startBatchUpload(extractedFiles);
    }
  };

  // 3. FILE PICKER HANDLER
  const handleFileInput = (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    filesArray.forEach(f => {
       f.customRelativePath = f.webkitRelativePath || f.name;
    });

    startBatchUpload(filesArray);
    e.target.value = null; 
  };


  // 4. BATCH UPLOAD INITIALIZER
  function startBatchUpload(filesArray) {
    const duplicateFolders = new Set();
    const duplicateFiles = new Set();

    filesArray.forEach((file, index) => {
      if (!file.uid) {
        file.uid = `file-${Date.now()}-${index}`;
      }

      const actualPath = file.customRelativePath || file.name;
      const isFolderUpload = actualPath.includes('/');
      const topLevelName = isFolderUpload ? actualPath.split('/')[0] : file.name;
      const kind = isFolderUpload ? "folder" : "file";

      const isDuplicate = items.some((item) => {
        const itemName = String(item.name || item.title || item.dumpTitle || "");
        return itemName.toLowerCase() === topLevelName.toLowerCase() && item.kind === kind;
      });

      if (isDuplicate) {
        if (kind === "folder") duplicateFolders.add(topLevelName);
        else duplicateFiles.add(topLevelName);
      }
    });

    if (duplicateFiles.size > 0 || duplicateFolders.size > 0) {
      setDuplicatePrompt({
        duplicateFiles: Array.from(duplicateFiles),
        duplicateFolders: Array.from(duplicateFolders),
        originalFiles: filesArray
      });
      return; 
    }

    proceedWithBatch(filesArray);
  }

  // 5. THE ACTUAL QUEUE BUILDER
  function proceedWithBatch(filesArray) {
    if (!isBatchActive.current) {
      isBatchActive.current = true;
      setUploadStatus("active");
      setOverallProgress(0);
      totalBytesRef.current = 0;
      loadedBytesRef.current = {};
      totalFilesRef.current = 0;
      processedFilesRef.current = 0;
      activeUploadsCount.current = 0;
      pendingUploads.current = [];
      setUploading(true);
      
      setIsPaused(false);
      isPausedRef.current = false;
    }

    filesArray.forEach(file => {
      const actualPath = file.customRelativePath || file.name;
      totalBytesRef.current += file.size || 0;
      loadedBytesRef.current[file.uid] = 0;
      totalFilesRef.current += 1;

      const uploadTask = async () => {
        try {
          setActiveUploads((prev) => prev + 1); 
          setUploadText(`Uploading file ${processedFilesRef.current + 1} of ${totalFilesRef.current}...`);
          
          const form = new FormData();
          form.append("file", file);
          if (actualPath) form.append("webkitRelativePath", actualPath);
          if (folderId) form.append("folderId", folderId);
          else if (rootId) form.append("folderId", rootId);

          const json = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhrs.current.add(xhr); 

            xhr.open("POST", docPath("/scratch/upload"));
            const token = getAccessToken();
            if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

            let uploadStartTime = Date.now();
            let zohoInterval = null;

            const updateGlobalProgress = () => {
              const currentTotalLoaded = Object.values(loadedBytesRef.current).reduce((a, b) => a + b, 0);
              let percent = totalBytesRef.current === 0 ? 100 : Math.round((currentTotalLoaded / totalBytesRef.current) * 100);
              if (percent > 99 && (activeUploadsCount.current > 0 || pendingUploads.current.length > 0)) {
                percent = 99; 
              }
              setOverallProgress(percent);
            };

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                loadedBytesRef.current[file.uid] = e.loaded / 2;
                updateGlobalProgress();

                // Smoothly simulate the server's processing time instead of freezing
                if (e.loaded >= e.total && !zohoInterval) {
                  const duration = Date.now() - uploadStartTime;
                  let simulatedExtra = 0;
                  
                  zohoInterval = setInterval(() => {
                    simulatedExtra += (file.size / 2) / 20;
                    if (simulatedExtra >= (file.size / 2) * 0.95) {
                      clearInterval(zohoInterval);
                    }
                    loadedBytesRef.current[file.uid] = (e.total / 2) + simulatedExtra;
                    updateGlobalProgress();
                  }, Math.max(duration / 20, 200));
                }
              }
            };

            xhr.onload = () => {
              if (zohoInterval) clearInterval(zohoInterval);
              activeXhrs.current.delete(xhr);

              if (xhr.status >= 200 && xhr.status < 300) {
                loadedBytesRef.current[file.uid] = file.size; 
                updateGlobalProgress();
                try { resolve(JSON.parse(xhr.responseText)); } catch (err) { resolve({}); }
              } else {
                try {
                  const errJson = JSON.parse(xhr.responseText);
                  reject(new Error(errJson.detail || errJson.message || errJson.error || `HTTP ${xhr.status}`));
                } catch {
                  reject(new Error(`Server Error HTTP ${xhr.status}: ${xhr.statusText}`));
                }
              }
            };

            xhr.onerror = () => {
              if (zohoInterval) clearInterval(zohoInterval);
              activeXhrs.current.delete(xhr);
              reject(new Error("Network Error"));
            };

            // This only triggers when we hit "Abort Upload"
            xhr.onabort = () => {
              if (zohoInterval) clearInterval(zohoInterval);
              activeXhrs.current.delete(xhr);
              loadedBytesRef.current[file.uid] = 0; 
              updateGlobalProgress();
              reject(new Error("USER_ABORT"));
            };
            
            xhr.send(form);
          });
          return json;
        } finally {
          setActiveUploads((prev) => prev - 1);
          processedFilesRef.current += 1; 
        }
      };

      pendingUploads.current.push(uploadTask);
    });

    processUploadQueue();
  }

  // 6. DECLARATIVE ABORT HANDLER (Fixed UI Bug)
  const handleAbortUpload = () => {
    pendingUploads.current = [];
    isBatchActive.current = false;
    setUploading(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setOverallProgress(0);
    setUploadModalOpen(false);
    
    // Kill the current active connections
    activeXhrs.current.forEach(xhr => xhr.abort());
    activeXhrs.current.clear();
    
    message.info("Upload aborted");
    loadFolder(folderId || rootId, trail);
  };

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

  // =========================================================================
  // RENAME LOGIC
  // =========================================================================
  function openRename(item) {
    setRenamingItem(item);
    setRenameValue(item.name || item.title || item.dumpTitle || "");
    setRenameModalOpen(true);
  }

  async function submitRename() {
    const newName = renameValue.trim();
    if (!newName || newName === (renamingItem.name || renamingItem.title || renamingItem.dumpTitle)) {
      setRenameModalOpen(false);
      return;
    }

    const isDuplicate = items.some((i) => 
      i.id !== renamingItem.id && 
      i.kind === renamingItem.kind && 
      (i.name || i.title || i.dumpTitle || "").toLowerCase() === newName.toLowerCase()
    );

    if (isDuplicate) {
      message.warning(`A ${renamingItem.kind} named "${newName}" already exists here.`);
      return;
    }

    setIsRenaming(true);
    try {
      const isFolder = renamingItem.kind === "folder";
      const endpoint = isFolder ? `/scratch/folders/${renamingItem.id}` : `/scratch/files/${renamingItem.id}`;
      
      const res = await apiFetch(docPath(endpoint), {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(json.error || json.detail || "Rename failed");
      
      message.success("Renamed successfully");
      setRenameModalOpen(false);
      loadFolder(folderId || rootId, trail);
    } catch (e) {
      message.error(`Rename error: ${e.message}`);
    } finally {
      setIsRenaming(false);
    }
  }

  // =========================================================================

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
      setCreateFolderWarning(name);
      return;
    }
    
    setCreatingFolder(true);
    try {
      const res = await apiFetch(docPath("/scratch/folders"), {
        method: "POST",
        body: JSON.stringify({ name, parentId: folderId || rootId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errText(json, res));
      message.success(`Folder "${name}" created`);
      setNewFolderName("");
      setCreateOpen(false);
      loadFolder(folderId || rootId, trail);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setCreatingFolder(false);
    }
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

  // =========================================================================
  // KEYBOARD SHORTCUTS & PASTE LOGIC
  // =========================================================================

  const executePaste = async (clipData, targetFolder, currentTrail) => {
    if (!clipData || clipData.items.length === 0) return;
    setPasting(true);
    
    const endpoint = clipData.action === 'cut' ? '/scratch/move' : '/scratch/copy';
    
    if (clipData.items.some(i => i.id === targetFolder)) {
      message.error(`Cannot ${clipData.action} an item into its own contents`);
      setPasting(false);
      return;
    }

    const currentItems = itemsRef.current || [];
    const duplicates = clipData.items.filter(clipItem => {
      const clipName = (clipItem.name || clipItem.title || clipItem.dumpTitle || '').toLowerCase();
      return currentItems.some(existingItem => 
        existingItem.kind === clipItem.kind && 
        (existingItem.name || existingItem.title || existingItem.dumpTitle || '').toLowerCase() === clipName
      );
    });

    if (duplicates.length > 0) {
      const dupNames = duplicates.map(d => d.name || d.title || d.dumpTitle).join(", ");
      setPasteWarning(dupNames);
      setPasting(false);
      return;
    }

    try {
      const res = await apiFetch(docPath(endpoint), {
        method: "POST",
        body: JSON.stringify({ 
          items: clipData.items, 
          parentId: targetFolder,
          sourceFolder: clipData.sourceFolder
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.detail || "Paste failed");
      
      message.success(`Successfully ${clipData.action === 'cut' ? 'moved' : 'copied'} items`);
      setClipboard(null);
      loadFolder(targetFolder, currentTrail);
    } catch (e) {
      message.error(`Paste error: ${e.message}`);
    } finally {
      setPasting(false);
    }
  };

  const handlePaste = () => {
    executePaste(clipboard, folderId || rootId, trail);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      
      if (active) {
        const isTextInput = active.tagName === "INPUT" && ['text', 'search', 'email', 'password', 'number'].includes(active.type);
        if (isTextInput || active.tagName === "TEXTAREA" || active.isContentEditable) {
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        const currentSelected = selectedRowsRef.current;
        const currentClipboard = clipboardRef.current;
        const currentFolder = folderIdRef.current || rootIdRef.current;
        const currentTrail = trailRef.current;

        if (key === 'c' && currentSelected.length > 0) {
          e.preventDefault();
          setClipboard({ action: 'copy', items: currentSelected, sourceFolder: currentFolder });
          message.success("Copied to clipboard");
        } 
        else if (key === 'x' && currentSelected.length > 0) {
          e.preventDefault();
          setClipboard({ action: 'cut', items: currentSelected, sourceFolder: currentFolder });
          setSelectedRowKeys([]);
          setSelectedRows([]);
          message.success("Cut to clipboard");
        } 
        else if (key === 'v' && currentClipboard && currentClipboard.items.length > 0) {
          e.preventDefault();
          executePaste(currentClipboard, currentFolder, currentTrail);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); 

  const handleSelectionChange = (keys) => {
    setSelectedRowKeys(keys);
    const rows = items.filter(item => keys.includes(item.id));
    setSelectedRows(rows);
  };

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
        if (row.kind === "folder") return <Typography variant="body2" color="text.secondary"> </Typography>;
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
              <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); openRename(row); }}>Rename</Link>
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
            <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); openRename(row); }}>Rename</Link>
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

  const actionNodeButtons = (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      
      {selectedRowKeys.length > 0 && (
        <>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<IconifyIcon icon="material-symbols:content-cut-outline-rounded" />}
            onClick={() => { 
              setClipboard({ action: 'cut', items: selectedRows, sourceFolder: folderId || rootId }); 
              setSelectedRowKeys([]); 
              setSelectedRows([]); 
              message.success("Cut to clipboard"); 
            }}
          >
            Cut
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<IconifyIcon icon="material-symbols:content-copy-outline-rounded" />}
            onClick={() => { 
              setClipboard({ action: 'copy', items: selectedRows, sourceFolder: folderId || rootId }); 
              message.success("Copied to clipboard"); 
            }}
          >
            Copy
          </Button>
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

      {/* Paste Button & Cancel Clipboard Button */}
      {clipboard && clipboard.items.length > 0 && (
        <Stack direction="row" sx={{ ml: 1, bgcolor: 'secondary.main', borderRadius: 1, overflow: 'hidden' }}>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<IconifyIcon icon="material-symbols:content-paste-rounded" />}
            onClick={handlePaste}
            disabled={pasting}
            sx={{ borderRadius: 0, boxShadow: 'none' }}
          >
            Paste ({clipboard.items.length})
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={() => setClipboard(null)}
            disabled={pasting}
            sx={{ minWidth: 0, px: 1, borderLeft: '1px solid rgba(255,255,255,0.2)', borderRadius: 0, boxShadow: 'none' }}
          >
            <IconifyIcon icon="material-symbols:close-rounded" />
          </Button>
        </Stack>
      )}
      
      {/* Divider if we have actions to separate them from the creation tools */}
      {(selectedRowKeys.length > 0 || clipboard) && (
        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', mx: 1 }} />
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

  const tableTitleNode = (
    <Stack direction="row" alignItems="center" spacing={1.5}>
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
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            All my dump files
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
            getRowSx={(row) => {
              if (clipboard?.action === 'cut' && clipboard.items.some(i => i.id === row.id)) {
                return { opacity: 0.4, transition: 'opacity 0.2s' };
              }
              return {};
            }}
        />

        {items.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2, px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {items.filter(item => item.kind === "folder").length} folder(s), {items.filter(item => item.kind !== "folder").length} file(s)
            </Typography>
          </Box>
        )}

        <Modal
          title={`Upload to "${currentName}"`}
          open={uploadModalOpen}
          onCancel={() => setUploadModalOpen(false)} 
          footer={
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
              {uploading ? (
                <Popconfirm
                  title="Abort Upload?"
                  description="Cancel all pending uploads? Partial files will be discarded."
                  onConfirm={handleAbortUpload}
                  okText="Yes, Abort"
                  cancelText="Keep Uploading"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    color="error" 
                    variant="outlined"
                    startIcon={<IconifyIcon icon="material-symbols:delete-outline" />}
                  >
                    Abort Upload
                  </Button>
                </Popconfirm>
              ) : <Box />}
              
              <Button 
                variant="outlined" 
                color="inherit"
                onClick={() => setUploadModalOpen(false)}
              >
                {uploading ? "Hide Window" : "Close"}
              </Button>
            </Stack>
          }
          destroyOnClose={false}
        >
          <div style={{ marginTop: 16 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={handleCustomDrop}
              onClick={() => {
                if (!uploading) fileInputRef.current?.click();
              }}
              style={{
                border: isDragging ? "2px dashed #1677ff" : "1px dashed #d9d9d9",
                backgroundColor: isDragging ? "#e6f4ff" : "#fafafa",
                padding: "32px 0",
                textAlign: "center",
                borderRadius: "8px",
                cursor: uploading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                opacity: uploading ? 0.6 : 1
              }}
            >
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                onChange={handleFileInput} 
              />
              <p style={{ margin: 0, fontSize: 36, color: isDragging ? '#1677ff' : '#4096ff' }}>
                <InboxOutlined />
              </p>
              <p style={{ marginTop: 12, fontSize: 16, color: "var(--mui-palette-text-primary)", fontWeight: 600 }}>
                Click here to browse, or drag & drop files into this box
              </p>
              <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: "var(--mui-palette-text-secondary)" }}>
                You can drop loose files or entire folders. 
                <br />
                Smart upload will preserve your folder hierarchy perfectly.
              </p>
            </div>
          </div>

          {uploading && (
            <div style={{ marginTop: 24, padding: "0 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                
                <Typography color={isPaused ? "warning.main" : "text.secondary"} fontWeight={600} variant="body2">
                  {overallProgress === 100 
                    ? "Finalizing upload..." 
                    : (isPaused 
                        ? (activeUploads > 0 ? "Pausing... (Finishing current file)" : "Queue Paused. Click Resume to continue.") 
                        : uploadText)}
                </Typography>

                <Stack alignItems="center" direction="row" spacing={2}>
                  {overallProgress < 100 && (
                    <Button 
                      variant={isPaused ? "outlined" : "contained"} 
                      color={isPaused ? "inherit" : "primary"} 
                      size="small" 
                      onClick={() => {
                        const nextState = !isPausedRef.current;
                        isPausedRef.current = nextState;
                        setIsPaused(nextState);
                        
                        if (!nextState) {
                          setUploadStatus("active");
                          setUploadText("Resuming upload...");
                          processUploadQueue();
                        } else {
                          setUploadStatus("normal");
                        }
                      }}
                    >
                      {isPaused ? <IconifyIcon icon="material-symbols:play-arrow-rounded" sx={{ mr: 0.5 }} /> : <IconifyIcon icon="material-symbols:pause-rounded" sx={{ mr: 0.5 }} />}
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {overallProgress}%
                  </Typography>
                </Stack>

              </div>
              <Progress 
                percent={overallProgress} 
                status={uploadStatus} 
                showInfo={false} 
                size={["100%", 10]} 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} 
              />
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Want to upload an entire folder structure?
            </Typography>
            <Upload
              beforeUpload={(f, fileList) => { 
                if (fileList.indexOf(f) === 0) {
                  const mappedList = fileList.map(fileItem => {
                    fileItem.customRelativePath = fileItem.webkitRelativePath || fileItem.name; 
                    return fileItem;
                  });
                  startBatchUpload(mappedList); 
                }
                return false; 
              }}
              showUploadList={false}
              multiple
              directory
            >
              <Button variant="outlined" startIcon={<FolderOpenOutlined />} disabled={uploading}>
                Select Folder to Upload
              </Button>
            </Upload>
          </div>
        </Modal>

        {/* New Folder Modal */}
        <Modal
          title={`New folder in "${currentName}"`}
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

        {/* Rename Modal */}
        <Modal
          title={`Rename ${renamingItem?.kind === "folder" ? "folder" : "file"}`}
          open={renameModalOpen}
          onOk={submitRename}
          confirmLoading={isRenaming}
          onCancel={() => setRenameModalOpen(false)}
          okText="Rename"
        >
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onPressEnter={submitRename}
            onFocus={(e) => {
               // Auto-select text excluding extension if it's a file
               if (renamingItem?.kind === 'file' && renameValue.includes('.')) {
                  e.target.setSelectionRange(0, renameValue.lastIndexOf('.'));
               } else {
                  e.target.select();
               }
            }}
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

        {/* Duplicate Resolver Modal */}
        <Modal
          title={<span style={{ color: '#faad14' }}>Items Already Exist</span>}
          open={!!duplicatePrompt}
          onCancel={() => setDuplicatePrompt(null)}
          footer={
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setDuplicatePrompt(null)} color="inherit">Cancel</Button>
              
              <Button 
                onClick={() => {
                  const filesToKeep = duplicatePrompt.originalFiles.filter(file => {
                    const actualPath = file.customRelativePath || file.name;
                    const topLevelName = actualPath.includes('/') ? actualPath.split('/')[0] : file.name;
                    return !duplicatePrompt.duplicateFiles.includes(topLevelName) && !duplicatePrompt.duplicateFolders.includes(topLevelName);
                  });
                  setDuplicatePrompt(null);
                  if (filesToKeep.length > 0) proceedWithBatch(filesToKeep);
                  else message.info("No files left to upload.");
                }}
              >
                Skip Existing
              </Button>

              {duplicatePrompt?.duplicateFolders.length > 0 && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    const filesToKeep = duplicatePrompt.originalFiles.filter(file => {
                      const actualPath = file.customRelativePath || file.name;
                      const isFolderUpload = actualPath.includes('/');
                      const topLevelName = isFolderUpload ? actualPath.split('/')[0] : file.name;
                      
                      if (!isFolderUpload && duplicatePrompt.duplicateFiles.includes(topLevelName)) return false;
                      return true; 
                    });
                    setDuplicatePrompt(null);
                    if (filesToKeep.length > 0) proceedWithBatch(filesToKeep);
                    else message.info("No files left to upload.");
                  }}
                >
                  Merge Folders & Skip Files
                </Button>
              )}
            </Stack>
          }
          centered
          zIndex={3000}
        >
          <Typography variant="body1" sx={{ mb: 2 }}>
            Some items you are trying to upload already exist in this folder:
          </Typography>
          
          {duplicatePrompt?.duplicateFiles?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error">Files:</Typography>
              <Typography variant="body2">{duplicatePrompt.duplicateFiles.join(', ')}</Typography>
            </Box>
          )}
          
          {duplicatePrompt?.duplicateFolders?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="warning.main">Folders:</Typography>
              <Typography variant="body2">{duplicatePrompt.duplicateFolders.join(', ')}</Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Choose how you would like to proceed with the remaining items.
          </Typography>
        </Modal>

        <Modal
          title={<span style={{ color: '#ff4d4f' }}>Folder already exists</span>}
          open={!!createFolderWarning}
          onOk={() => setCreateFolderWarning(null)}
          onCancel={() => setCreateFolderWarning(null)}
          okText="Understood"
          cancelButtonProps={{ style: { display: 'none' } }}
          centered
          zIndex={3000}
        >
          <Typography variant="body1">
            A folder named <strong>{createFolderWarning}</strong> already exists in this location. Please choose a different name.
          </Typography>
        </Modal>

        <Modal
          title={<span style={{ color: '#ff4d4f' }}>Upload Blocked</span>}
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

        <DocSharePanel
          items={shareItems}
          open={shareItems.length > 0}
          onClose={() => setShareItems([])}
        />
      </CardContent>
    </MuiCard>
  );
}