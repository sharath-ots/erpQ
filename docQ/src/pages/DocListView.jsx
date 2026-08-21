"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";

// MUI Imports
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField, 
  Typography,
} from "@mui/material";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";

// Sub-components
import DocDocumentGrid from "./DocDocumentGrid";
// import DocRevokePanel from "./DocRevokePanel";

export default function DocListView({
  title,
  embedded = false,
  description,
  view,
  zone = "managed",
  showActions = false,
  authorActions = false,
  emptyHint,
}) {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [docType, setDocType] = useState("");
  
  const [actionDoc, setActionDoc] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [revokeDoc, setRevokeDoc] = useState(null);
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (view) params.set("view", view);
      if (!view && zone) params.set("zone", zone);
      if (docType && docType !== "all") params.set("docType", docType);
      if (q) params.set("q", q);
      
      const res = await apiFetch(`${docPath("/documents")}?${params}`);
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(json.detail || json.error || res.statusText);
      setDocs(json.documents || []);
    } catch (e) {
      alert(String(e.message || e)); 
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [view, zone, docType, q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view !== "revocable") return;
    apiFetch(`${docPath("/org/users")}?limit=100`)
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []))
      .catch(() => {});
  }, [view]);

  async function runTransition(action, doc, extra = {}) {
    setSubmitting(true);
    try {
      const body = { action, comment, ...extra };
      if (action === "request_changes") {
        body.reviewPoints = comment.split(/\n/).map((s) => s.trim()).filter(Boolean);
      }
      const res = await apiFetch(docPath(`/documents/${doc.id}/transition`), {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(json.detail || json.error || res.statusText);
      
      alert(json.message || (action === "submit" ? "Submitted for review" : "Done"));
      setActionDoc(null);
      setComment("");
      load();
    } catch (e) {
      alert(String(e.message || e)); 
    } finally {
      setSubmitting(false);
    }
  }

  // FIXED: Removed the floating 'label' prop so it perfectly aligns with the search box
  const tableFilters = (
    <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
      <StyledTextField
        size="small"
        placeholder="Search documents..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && load()}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconifyIcon icon="material-symbols:search-rounded" />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 240 }}
      />
      <StyledTextField
        select
        size="small"
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
        SelectProps={{ displayEmpty: true }}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">All Doc Types</MenuItem>
        {["general","manual","contract","design","cad","spec","policy"].map((v) => (
          <MenuItem key={v} value={v} sx={{ textTransform: 'capitalize' }}>{v}</MenuItem>
        ))}
      </StyledTextField>
    </Stack>
  );

  return (
    <>
      <Card elevation={embedded ? 0 : 1} sx={{ border: embedded ? 'none' : '1px solid', borderColor: 'divider', mb: 0 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 }, "&:last-child": { pb: { xs: 2, md: 3 } } }}>
          
          {/* Header Section */}
          <Box sx={{ mb: 3 }}>
            {!embedded && title && (
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
          
          {/* Main Grid Component */}
          <DocDocumentGrid
            documents={docs}
            loading={loading}
            view={view}
            showActions={showActions}
            authorActions={authorActions}
            filterNode={tableFilters} // Maps to the left side of the table toolbar
            emptyHint={emptyHint}
            onSubmit={(row) => runTransition("submit", row, {})}
            onResubmit={(row) => runTransition("resubmit", row, {})}
            onApprove={(row) => { setActionDoc(row); setActionType("approve"); setComment(""); }}
            onRequestChanges={(row) => { setActionDoc(row); setActionType("request_changes"); setComment(""); }}
            onRevoke={view === "revocable" ? (row) => setRevokeDoc(row) : undefined}
            onOpen={(row) => router.push(`/m/docq/documents/${row.id}`)}
          />
        </CardContent>
      </Card>
      
      {/* Action Dialog (Approve / Reject) */}
      <Dialog 
        open={Boolean(actionDoc)} 
        onClose={() => !submitting && setActionDoc(null)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            {actionType === "approve" ? "Approve Document" : "Request Changes"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.primary" sx={{ mb: 2 }}>
            {actionDoc?.title}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={actionType === "request_changes" ? 5 : 3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={actionType === "request_changes" ? "One review point per line..." : "Optional comment..."}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button 
            onClick={() => setActionDoc(null)} 
            color="inherit" 
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => runTransition(actionType, actionDoc)} 
            variant="contained" 
            color={actionType === "approve" ? "success" : "warning"}
            disabled={submitting}
          >
            {submitting ? "Processing..." : (actionType === "approve" ? "Approve" : "Send back")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* <DocRevokePanel
        open={Boolean(revokeDoc)}
        documentId={revokeDoc?.id}
        documentTitle={revokeDoc?.title}
        currentAuthor={revokeDoc?.author_email}
        versionLabel={revokeDoc?.version_label}
        users={users}
        onClose={() => setRevokeDoc(null)}
        onRevoked={() => {
          setRevokeDoc(null);
          load();
        }}
      /> */}
      
    </>
  );
}