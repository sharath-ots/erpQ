"use client";

import { Button, Card, Table, Typography, Upload, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apigate";
import { docPath } from "./docQApi";

export default function DocScratchPad() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${docPath("/documents")}?zone=scratch&mine=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setDocs(json.documents || []);
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(file) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(docPath("/scratch/upload"), {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      message.success("Uploaded to scratch pad");
      load();
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setUploading(false);
    }
    return false;
  }

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Updated", dataIndex: "updated_at", key: "updated_at" },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <>
          {row.workdrive_permalink ? (
            <a href={row.workdrive_permalink} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : null}
          {" · "}
          <Link href={`/m/docq/documents/${row.id}`}>Details</Link>
        </>
      ),
    },
  ];

  return (
    <Card title="Scratch pad — private file dump">
      <Typography.Paragraph type="secondary">
        Uncategorised files visible only to you unless shared. Promote to managed library to start approval workflow.
      </Typography.Paragraph>
      <Upload beforeUpload={onUpload} showUploadList={false} maxCount={1}>
        <Button type="primary" loading={uploading}>
          Upload file
        </Button>
      </Upload>
      <Table
        style={{ marginTop: 16 }}
        rowKey="id"
        loading={loading}
        dataSource={docs}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
}
