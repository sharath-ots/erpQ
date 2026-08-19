"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";

// MUI Imports
import { Box, Button, Breadcrumbs, Card, Link, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";
import { CommonDataGrid } from "../components/common/CustomTable";

export default function SharedFolderBrowser({ shareId, folderName }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  
  const [trail, setTrail] = useState([
    { id: null, name: folderName || "Shared Folder" }
  ]);

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

  // Aurora Styled Columns mapping
  const headCells = [
    {
      id: "name",
      label: "Name",
      numeric: false,
      render: (name, record) => (
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {record.type === "folder" ? (
            <IconifyIcon icon="material-symbols:folder-rounded" sx={{ color: 'warning.main', fontSize: 20 }} />
          ) : (
            <IconifyIcon icon="material-symbols:draft-outline-rounded" sx={{ color: 'text.secondary', fontSize: 20 }} />
          )}
          
          {record.type === "folder" ? (
            <Link 
              component="button" 
              variant="body2" 
              underline="hover" 
              color="text.primary" 
              fontWeight={600} 
              onClick={() => goDown(record)}
            >
              {name}
            </Link>
          ) : (
            <Link 
              href={record.permalink} 
              target="_blank" 
              rel="noreferrer" 
              variant="body2" 
              underline="hover" 
              color="text.primary"
              fontWeight={500}
            >
              {name}
            </Link>
          )}
        </Stack>
      ),
    },
    {
      id: "type",
      label: "Type",
      numeric: false,
      render: (type) => (
        <Typography variant="body2" color="text.secondary" textTransform="capitalize">
          {type === "folder" ? "Folder" : "File"}
        </Typography>
      ),
    }
  ];

  // Aurora Styled Breadcrumbs Node
  const tableTitleNode = (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Button
        variant="soft"
        color="secondary"
        size="small"
        onClick={goUp}
        disabled={trail.length === 1}
        startIcon={<IconifyIcon icon="material-symbols:arrow-back-rounded" />}
      >
        Back
      </Button>

      <Breadcrumbs separator={<IconifyIcon icon="material-symbols:chevron-right-rounded" sx={{ fontSize: 16 }} />}>
        {trail.map((t, i) => {
          const isLast = i === trail.length - 1;
          const content = (
            <Typography 
              variant={isLast ? "subtitle2" : "body2"} 
              fontWeight={isLast ? 600 : 400} 
              color={isLast ? "text.primary" : "text.secondary"}
            >
              {t.name}
            </Typography>
          );
          return isLast ? (
            <Box key={i}>{content}</Box>
          ) : (
            <Link 
              key={i} 
              component="button" 
              variant="body2" 
              underline="hover" 
              onClick={() => setTrail(trail.slice(0, i + 1))}
            >
              {content}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Stack>
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CommonDataGrid 
        title={tableTitleNode}
        headCells={headCells} 
        rows={items} 
        loading={loading}
        defaultPageSize={10} 
        onRowClick={(row) => row.type === "folder" ? goDown(row) : null}
      />
    </Card>
  );
}