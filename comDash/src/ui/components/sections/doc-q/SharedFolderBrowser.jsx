"use client";

import { useState, useEffect } from "react";
import { Table, Button, Breadcrumb, Card, Space } from "antd";
import { FolderOutlined, FileOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";

export default function SharedFolderBrowser({ shareId, folderName }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  
  // Use the passed folderName, defaulting to "Shared Folder" if not available
  const [trail, setTrail] = useState([
    { id: null, name: folderName || "Shared Folder" }
  ]);

  // Keep the root name updated if folderName changes asynchronously
  useEffect(() => {
    if (folderName && trail.length === 1 && trail[0].name === "Shared Folder Root") {
      setTrail([{ id: null, name: folderName }]);
    }
  }, [folderName]);

  const currentFolderId = trail[trail.length - 1].id;

  const loadFolder = async (folderId) => {
    setLoading(true);
    try {
      const url = folderId 
        ? docPath(`/folder-shares/${shareId}/browse?folderId=${folderId}`)
        : docPath(`/folder-shares/${shareId}/browse`);
        
      const res = await apiFetch(url);
      const json = await res.json();
      if (res.ok) {
        setItems([...(json.folders || []), ...(json.files || [])]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, shareId]);

  const goDown = (folder) => {
    setTrail([...trail, { id: folder.id, name: folder.name }]);
  };

  const goUp = () => {
    if (trail.length > 1) {
      setTrail(trail.slice(0, -1));
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name, record) => (
        <Space>
          {record.type === "folder" ? <FolderOutlined style={{ color: "#faad14" }} /> : <FileOutlined />}
          {record.type === "folder" ? (
            <a onClick={() => goDown(record)} style={{ fontWeight: 500 }}>{name}</a>
          ) : (
            <a href={record.permalink} target="_blank" rel="noreferrer">
              {name}
            </a>
          )}
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 120,
      render: (type) => (type === "folder" ? "Folder" : "File"),
    }
  ];

  return (
    <Card title={`Browse — ${folderName || "Shared Folder"}`} style={{ marginTop: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goUp} disabled={trail.length === 1}>
          Back
        </Button>
        <Breadcrumb items={trail.map(t => ({ title: t.name }))} />
      </Space>
        
      <Table 
        dataSource={items} 
        columns={columns} 
        rowKey="id"
        loading={loading} 
        pagination={false} 
        size="middle"
        onRow={(record) => ({
          onDoubleClick: () => {
            if (record.type === "folder") goDown(record);
          }
        })}
      />
    </Card>
  );
}