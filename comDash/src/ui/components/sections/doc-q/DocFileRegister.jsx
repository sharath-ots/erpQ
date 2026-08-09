"use client";

import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  HomeOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";
import DocSharePanel from "./DocSharePanel";

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
  const [uploading, setUploading] = useState(false);

  // Sharing states
  const [shareItems, setShareItems] = useState([]); 
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sharingBulk, setSharingBulk] = useState(false);

  // Registering states
  const [registerFile, setRegisterFile] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [registerForm] = Form.useForm();

  // Used to batch concurrent file uploads (crucial for folder uploads)
  const activeUploads = useRef(0);

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

  // Upload handler for single, multiple, drag & drop, and folder batch uploads
  async function onUpload(file) {
    activeUploads.current++;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // Pass the relative path to retain folder structures on the backend if supported
      if (file.webkitRelativePath) {
        form.append("webkitRelativePath", file.webkitRelativePath);
      }
      if (folderId) form.append("folderId", folderId);
      
      const res = await apiFetch(docPath("/scratch/upload"), {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errText(json, res));
    } catch (e) {
      message.error(`Failed on “${file.name}”: ${e.message || e}`);
    } finally {
      activeUploads.current--;
      // When the last upload in the batch finishes, refresh the UI and close modal
      if (activeUploads.current === 0) {
        setUploading(false);
        setUploadModalOpen(false); // Close the popup automatically
        message.success(`Upload complete`);
        loadFolder(folderId || rootId, trail);
      }
    }
    return false; // Prevent default antd action
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

  const currentName = trail[trail.length - 1]?.name || "My Folders";

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, row) =>
        row.kind === "folder" ? (
          <a onClick={() => openFolder(row)}>
            <FolderOutlined style={{ marginRight: 8, color: "#faad14" }} />
            {name}
          </a>
        ) : (
          <span>
            <FileOutlined style={{ marginRight: 8 }} />
            {name}
          </span>
        ),
    },
    {
      title: "Type",
      key: "kind",
      width: 90,
      render: (_, row) => (row.kind === "folder" ? "Folder" : "File"),
    },
    {
      title: "Status",
      key: "registered",
      width: 120,
      render: (_, row) => {
        if (row.kind === "folder") return "—";
        return row.registered ? <Tag color="green">Registered</Tag> : <Tag>Dump</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      render: (_, row) => {
        if (row.kind === "folder") {
          return (
            <Space size="middle">
              <a onClick={() => openFolder(row)}>Open</a>
              <a onClick={() => onShare(row)}>Share</a>
            </Space>
          );
        }
        return (
          <Space size="middle" wrap>
            {row.permalink ? (
              <a href={row.permalink} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : (
              <Typography.Text type="secondary">Open</Typography.Text>
            )}
            <a onClick={() => onShare(row)}>Share</a>
            {row.registered && row.managedDocumentId ? (
              <Link href={`/m/docq/documents/${row.managedDocumentId}`}>
                View managed
              </Link>
            ) : (
              <a onClick={() => openRegister(row)}>Register</a>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card title="All my dump files">
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Browse your personal WorkDrive folders. Upload here, then{" "}
        <strong>Register</strong> to copy a file into managed documents (the dump
        file stays; it is marked Registered so you do not register twice).
      </Typography.Paragraph>

      <Card
        size="small"
        title={
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              disabled={trail.length <= 1}
              onClick={goUp}
            >
              Up
            </Button>
            <Breadcrumb
              items={trail.map((t, i) => ({
                title:
                  i === trail.length - 1 ? (
                    <span>
                      {i === 0 ? <HomeOutlined style={{ marginRight: 4 }} /> : null}
                      {t.name}
                    </span>
                  ) : (
                    <a onClick={() => goToTrail(i)}>
                      {i === 0 ? <HomeOutlined style={{ marginRight: 4 }} /> : null}
                      {t.name}
                    </a>
                  ),
              }))}
            />
          </Space>
        }
        extra={
          <Space wrap>
            {selectedRowKeys.length > 0 && (
              <Button 
                type="primary" 
                ghost 
                icon={<ShareAltOutlined />} 
                onClick={onShareSelected}
                loading={sharingBulk}
              >
                Share {selectedRowKeys.length} selected
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => loadFolder(folderId, trail)}>
              Refresh
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
              disabled={!folderId && !rootId}
            >
              New folder
            </Button>
            {/* Replaced massive block with single upload button */}
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalOpen(true)}
              disabled={!folderId && !rootId}
            >
              Upload
            </Button>
          </Space>
        }
      >
        <Table
          size="middle"
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={false}
          locale={{ emptyText: "This folder is empty." }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            },
          }}
          onRow={(row) =>
            row.kind === "folder"
              ? { onDoubleClick: () => openFolder(row), style: { cursor: "pointer" } }
              : {}
          }
        />
      </Card>

      {/* Upload Popup Modal */}
      <Modal
        title={`Upload to “${currentName}”`}
        open={uploadModalOpen}
        onCancel={() => !uploading && setUploadModalOpen(false)}
        footer={
          <Button onClick={() => setUploadModalOpen(false)} disabled={uploading}>
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

        <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            Want to upload an entire folder structure?
          </Typography.Text>
          <Upload
            beforeUpload={onUpload}
            showUploadList={false}
            multiple
            directory
            disabled={uploading}
          >
            <Button icon={<FolderOpenOutlined />} loading={uploading}>
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
        <Typography.Paragraph type="secondary">
          Creates a <strong>copy</strong> in the managed vault. Your dump file stays
          here and will show as Registered.
        </Typography.Paragraph>
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
          <Button type="primary" htmlType="submit" loading={registering} block>
            Copy &amp; register
          </Button>
        </Form>
      </Modal>

      <DocSharePanel
        items={shareItems}
        open={shareItems.length > 0}
        onClose={() => setShareItems([])}
      />
    </Card>
  );
}