"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";

// MUI Imports
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  Grid,
  Link,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { 
  Table as MuiTable, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  TableContainer
} from "@mui/material";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";

// Sub-components
import DocMetadataPanel from "./DocMetadataPanel";
import DocWorkflowBanner from "./DocWorkflowBanner";
import DocSharePanel from "./DocSharePanel";
import DocRevokePanel from "../../../comDash/src/ui/components/sections/doc-q/DocRevokePanel";
import { versionLabel } from "./DocDocumentGrid";
import SharedFolderBrowser from "./SharedFolderBrowser";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";
import { displayStatus } from "./docStatus";

export default function DocDetail({ documentId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMode = searchParams.get("register") === "1";
  const metadataRef = useRef(null);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  const [shareOpen, setShareOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [promoteDocType, setPromoteDocType] = useState("general");
  const [promoteTitle, setPromoteTitle] = useState("");

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}`));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
      if (json?.document) {
        setPromoteTitle(json.document.title || "");
        setPromoteDocType(json.document.doc_type || "general");
      }
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
    apiFetch(docPath("/org/users"))
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [load]);

  const ACTION_SUCCESS = {
    submit: "Submitted for review",
    resubmit: "Resubmitted for review",
    approve: "Approved — moved to the next stage",
    request_changes: "Sent back to the author with review points",
    archive: "Document archived",
    revoke: "Document revoked for revision",
  };

  async function openHistorySnapshot(label) {
    if (!label) return;
    setSnapshotLoading(true);
    setSnapshotOpen(true);
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/history/${encodeURIComponent(label)}`));
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      setSnapshot(json.snapshot);
    } catch (e) {
      alert(String(e.message || e));
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function transition(action, extra = {}) {
    setActionLoading(true);
    try {
      let metadataSaved = false;
      if (action === "submit" || action === "resubmit") {
        const flush = await metadataRef.current?.flushSave?.();
        if (flush && flush.ok === false) return;
        metadataSaved = Boolean(flush?.saved);
      }
      const res = await apiFetch(docPath(`/documents/${documentId}/transition`), {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || res.statusText);
      
      alert(metadataSaved && (action === "submit" || action === "resubmit") 
        ? (action === "resubmit" ? "Metadata saved, then resubmitted" : "Metadata saved, then submitted")
        : (ACTION_SUCCESS[action] || "Updated")
      );
      await load();
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setActionLoading(false);
    }
  }

  async function promote() {
    try {
      const res = await apiFetch(docPath(`/documents/${documentId}/promote`), {
        method: "POST",
        body: JSON.stringify({ title: promoteTitle, docType: promoteDocType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      
      alert("Registered — managed copy created; dump file kept");
      const managedId = json.document?.id;
      
      if (managedId && managedId !== documentId) {
        router.replace(`/m/docq/documents/${managedId}`);
      } else {
        load();
        if (registerMode) router.replace(`/m/docq/documents/${documentId}`);
      }
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  if (loading && !data) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Loading document...</Typography></Box>;
  if (!data?.document) return <Box sx={{ p: 4 }}><Typography>Document not found</Typography></Box>;

  const doc = data.document;
  const shareCount = (data.shares || []).length;
  const status = displayStatus(doc);

  return (
    // FIXED: Added p: { xs: 2, md: 4 } to provide proper breathing room around the entire page
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 }, pb: 8 }}>
      
      {/* 1. TOP NAVIGATION */}
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="text" 
          color="secondary" 
          size="small"
          onClick={() => router.push("/m/docq/my-documents")}
          startIcon={<IconifyIcon icon="material-symbols:arrow-back-rounded" />}
          sx={{ textTransform: 'none', fontWeight: 600, ml: -1 }}
        >
          Back to library
        </Button>
      </Box>

      {/* 2. DOCUMENT HEADER */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="flex-start" 
        flexWrap="wrap" 
        gap={2} 
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" fontWeight={700} sx={{ wordBreak: 'break-word', flex: 1, letterSpacing: '-0.02em' }}>
          {doc.title || "Untitled document"}
        </Typography>
        
        <Stack direction="row" spacing={1.5} flexShrink={0}>
          {doc.workdrive_permalink && (
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              href={doc.workdrive_permalink} 
              target="_blank" 
              rel="noreferrer"
              startIcon={<IconifyIcon icon="material-symbols:open-in-new-rounded" />}
            >
              Open in WorkDrive
            </Button>
          )}
          <Button 
            variant="contained" 
            color="primary" 
            size="small"
            onClick={() => setShareOpen(true)}
            startIcon={<IconifyIcon icon="material-symbols:share-outline" />}
          >
            Share {shareCount ? `(${shareCount})` : ""}
          </Button>
        </Stack>
      </Stack>

      {/* 3. ALERTS & BANNERS */}
      <Box sx={{ mb: 4 }}>
        <DocWorkflowBanner
          doc={doc}
          data={data}
          users={users}
          loading={actionLoading}
          onTransition={transition}
          onRevoke={() => setRevokeOpen(true)}
        />
        {doc.state === "under_revision" && (
          <Alert severity="warning" icon={<IconifyIcon icon="material-symbols:info-outline" />} sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>Under revision</Typography>
            <Typography variant="body2">
              {doc.revision_of_label && <>Revising from approved <strong>Ver {doc.revision_of_label}</strong> {doc.version_label && `→ current Ver ${doc.version_label}`}.<br/></>}
              {doc.revoke_reason && <>Reason: {doc.revoke_reason}<br/></>}
              {doc.under_revision_since && <>Since: {new Date(doc.under_revision_since).toLocaleString()}</>}
            </Typography>
          </Alert>
        )}
      </Box>

      {/* 4. UNIFIED MASTER CARD (Everything aligned inside one outer border) */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 4, overflow: 'hidden' }}>
        
        {/* Workflow Section (Top) */}
        <Box sx={{ bgcolor: 'action.hover', p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Workflow Status</Typography>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>State</Typography>
              <Chip label={status.label} size="small" variant="soft" color={status.color} sx={{ fontWeight: 600 }} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Workflow Stage</Typography>
              {doc.workflow_stage ? <Chip label={doc.workflow_stage} color="info" size="small" variant="soft" sx={{ fontWeight: 600 }} /> : <Typography variant="body2" fontWeight={500}>—</Typography>}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Zone</Typography>
              <Typography variant="body2" fontWeight={600} textTransform="capitalize">{doc.zone}</Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Review Round</Typography>
              <Typography variant="body2" fontWeight={600}>{doc.review_round ?? 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Version</Typography>
              <Typography variant="body2" fontWeight={600}>{doc.version_label ? `Ver ${doc.version_label}` : doc.version}</Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Current Assignee</Typography>
              <Typography variant="body2" fontWeight={600}>{doc.current_approver_email || "—"}</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Promote Box Section (Middle - Only if scratch) */}
        {doc.zone === "scratch" && (
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {registerMode ? "Register Document" : "Register into managed library"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {doc.dump_registered 
                ? "Already registered. The dump file stays in your personal folder."
                : "Copies this dump file into managed documents. The original stays in your dump folder and is marked Registered."
              }
            </Typography>

            {!doc.dump_registered && (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <StyledTextField
                  select
                  size="small"
                  value={promoteDocType}
                  onChange={(e) => setPromoteDocType(e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  {["general", "manual", "contract", "design", "cad", "spec", "policy"].map((v) => (
                    <MenuItem key={v} value={v} sx={{ textTransform: 'capitalize' }}>{v}</MenuItem>
                  ))}
                </StyledTextField>
                <StyledTextField
                  size="small"
                  placeholder="Document name"
                  value={promoteTitle}
                  onChange={(e) => setPromoteTitle(e.target.value)}
                  sx={{ minWidth: 280 }}
                />
                <Button variant="contained" color="primary" onClick={promote} disabled={!promoteTitle} sx={{ height: 40 }}>
                  Copy & register
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {/* Metadata Section (Bottom) */}
        <Box sx={{ p: 3 }}>
          <DocMetadataPanel
            ref={metadataRef}
            documentId={documentId}
            data={data}
            onUpdated={load}
          />
        </Box>

      </Card>
      
      {/* 5. TABS / FOLDER BROWSER (Second Card for content/history) */}
      <Box>
        {doc.doc_type === "folder" ? (
          <SharedFolderBrowser shareId={doc.id} folderName={doc.title}/>
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                variant="scrollable" 
                scrollButtons="auto"
                sx={{ px: 2 }}
              >
                <Tab label="Workflow tasks" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Metadata history" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Review points" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Workflow history" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Review comments" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label="Versions" sx={{ textTransform: 'none', fontWeight: 600 }} />
              </Tabs>
            </Box>
            
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <MuiTable size="small">
                {/* Active Tab: Workflow Tasks */}
                {activeTab === 0 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Stage</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Assignee</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Decision</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Due</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.workflowTasks || []).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.stage_id}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{row.role}</TableCell>
                          <TableCell>{row.assignee_email}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.decision}</TableCell>
                          <TableCell>{row.due_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Active Tab: Metadata History */}
                {activeTab === 1 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Old</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>New</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.metadataHistory || []).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.field_name}</TableCell>
                          <TableCell>{row.old_value}</TableCell>
                          <TableCell>{row.new_value}</TableCell>
                          <TableCell>{row.changed_by_email}</TableCell>
                          <TableCell>{row.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Active Tab: Review Points */}
                {activeTab === 2 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Round</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Stage</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Point</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.reviewPoints || []).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.round}</TableCell>
                          <TableCell>{row.stage_id}</TableCell>
                          <TableCell>{row.body}</TableCell>
                          <TableCell><Chip label={row.status} size="small" variant="soft" /></TableCell>
                          <TableCell>{row.created_by_email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Active Tab: Workflow History */}
                {activeTab === 3 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>From</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>To</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Comment</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.history || []).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{row.action}</TableCell>
                          <TableCell><Chip label={row.from_state} size="small" variant="outlined" /></TableCell>
                          <TableCell><Chip label={row.to_state} size="small" variant="soft" color="info" /></TableCell>
                          <TableCell>{row.actor_email}</TableCell>
                          <TableCell>{row.comment || "—"}</TableCell>
                          <TableCell>{row.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Active Tab: Review Comments */}
                {activeTab === 4 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Author</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Comment</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.reviewComments || []).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.author_email}</TableCell>
                          <TableCell>{row.body}</TableCell>
                          <TableCell>{row.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Active Tab: Versions */}
                {activeTab === 5 && (
                  <>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Historical</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>At</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Open</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>History</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.versions || []).map((row) => {
                        const hasSnapshot = row.is_historical || (data.historySnapshots || []).some((s) => s.version_label === row.version_label);
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell fontWeight={600}>{versionLabel(row)}</TableCell>
                            <TableCell>{row.is_historical ? <Chip size="small" label="Archived" variant="soft" color="default" /> : "—"}</TableCell>
                            <TableCell>{row.uploaded_by_email}</TableCell>
                            <TableCell>{row.change_summary || "—"}</TableCell>
                            <TableCell>{row.created_at}</TableCell>
                            <TableCell>
                              {row.workdrive_permalink ? (
                                <Link href={row.workdrive_permalink} target="_blank" rel="noreferrer" underline="hover">Open</Link>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {hasSnapshot ? (
                                <Button variant="text" size="small" onClick={() => openHistorySnapshot(row.version_label)}>Snapshot</Button>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </>
                )}
                
                {/* Empty States */}
                {((activeTab === 0 && !data.workflowTasks?.length) ||
                  (activeTab === 1 && !data.metadataHistory?.length) ||
                  (activeTab === 2 && !data.reviewPoints?.length) ||
                  (activeTab === 3 && !data.history?.length) ||
                  (activeTab === 4 && !data.reviewComments?.length) ||
                  (activeTab === 5 && !data.versions?.length)) && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <IconifyIcon icon="material-symbols:inbox-outline" sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No data available for this tab</Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </MuiTable>
            </TableContainer>
          </Card>
        )}
      </Box>

      {/* Modals & Drawers */}
      <DocSharePanel documentId={documentId} documentTitle={doc.title} open={shareOpen} onClose={() => setShareOpen(false)} onChanged={load} />
      <DocRevokePanel open={revokeOpen} documentId={documentId} documentTitle={doc.title} currentAuthor={doc.author_email} versionLabel={doc.version_label} users={users} onClose={() => setRevokeOpen(false)} onRevoked={() => { setRevokeOpen(false); load(); }} />

      {/* Snapshot Drawer */}
      <Drawer anchor="right" open={snapshotOpen} onClose={() => { setSnapshotOpen(false); setSnapshot(null); }} PaperProps={{ sx: { width: { xs: '100%', sm: 600 }, p: 0 } }}>
         <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <Typography variant="h6" fontWeight={700}>
            {snapshot ? `Snapshot — Ver ${snapshot.version_label}` : "History snapshot"}
          </Typography>
          <Button onClick={() => setSnapshotOpen(false)} color="inherit" sx={{ minWidth: 0, p: 1 }}>
            <IconifyIcon icon="material-symbols:close-rounded" />
          </Button>
        </Box>

        <Box sx={{ p: 3, overflowY: 'auto' }}>
          {snapshotLoading ? (
            <Typography>Loading snapshot...</Typography>
          ) : snapshot ? (
            <Stack direction="column" spacing={4}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block" gutterBottom>Version</Typography><Typography variant="body2" fontWeight={600}>{snapshot.version_label}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block" gutterBottom>State at snapshot</Typography><Chip label={snapshot.state_at_snapshot} size="small" variant="soft" /></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block" gutterBottom>Stamped by</Typography><Typography variant="body2" fontWeight={600}>{snapshot.stamped_by_email}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary" display="block" gutterBottom>Stamped at</Typography><Typography variant="body2" fontWeight={600}>{snapshot.stamped_at ? new Date(snapshot.stamped_at).toLocaleString() : "—"}</Typography></Grid>
                    {snapshot.workdrive_permalink && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>File</Typography>
                        <Link href={snapshot.workdrive_permalink} target="_blank" rel="noreferrer" variant="body2" fontWeight={600} underline="hover">Open in WorkDrive</Link>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Metadata at snapshot</Typography>
                <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', color: 'var(--mui-palette-text-primary)' }}>{JSON.stringify(snapshot.metadata || {}, null, 2)}</pre>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Review / workflow bundle</Typography>
                <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto', maxHeight: 400 }}>
                  <pre style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', color: 'var(--mui-palette-text-primary)' }}>{JSON.stringify(snapshot.bundle || {}, null, 2)}</pre>
                </Box>
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No snapshot found for this version.</Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}