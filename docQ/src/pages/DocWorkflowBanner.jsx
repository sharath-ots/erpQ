"use client";

import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";
import { displayStatus } from "./docStatus";
import DocEmailSelect from "./DocEmailSelect";

export default function DocWorkflowBanner({
  doc,
  data,
  users = [],
  loading = false,
  onTransition,
  onRevoke,
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
  const [comment, setComment] = useState("");
  const [firstApproverEmail, setFirstApproverEmail] = useState("");

  if (!doc) return null;

  const pendingTask = data?.currentUserPendingTask;
  const status = displayStatus(doc);
  const openReviewPoints = (data?.reviewPoints || []).filter((p) => p.status === "open");

  let headline = "";
  let description = "";
  let actions = null;
  let severity = "info";

  if (doc.zone === "scratch") {
    headline = "Scratch file — not in workflow yet";
    description = "Promote this file to a managed document before submitting for review.";
    severity = "warning";
  } else if (doc.state === "under_revision" && data?.authorCanEdit) {
    headline = "Under revision";
    description = doc.revoke_reason
      ? `This document was revoked for revision. Reason: ${doc.revoke_reason}. Update metadata/file as needed, then submit to re-enter the workflow.`
      : "This document was revoked for revision. Update metadata/file as needed, then submit to re-enter the workflow.";
    severity = "error";
    actions = (
      <Button variant="contained" color="error" disabled={loading} onClick={() => setSubmitOpen(true)}>
        Submit revised document
      </Button>
    );
  } else if (doc.state === "draft" && data?.authorCanEdit) {
    headline = "Ready to submit";
    description =
      "This document is a draft. When metadata and file are complete, submit it to start the review workflow. Reviewers and approvers are assigned automatically from the document type workflow.";
    severity = "warning";
    actions = (
      <Button variant="contained" color="warning" disabled={loading} onClick={() => setSubmitOpen(true)}>
        Submit for review
      </Button>
    );
  } else if (doc.state === "changes_requested" && data?.authorCanEdit) {
    headline = "Changes requested — with you";
    description = `Fix the open review point(s), update the file if needed, then resubmit.`;
    severity = "warning";
    actions = (
      <Button
        variant="contained"
        color="warning"
        disabled={loading}
        onClick={() => onTransition("resubmit", { comment: "" })}
      >
        Resubmit for review
      </Button>
    );
  } else if (pendingTask) {
    const roleLabel = pendingTask.role === "approver" ? "approval" : "review";
    headline = `Action required — ${roleLabel}`;
    description =
      pendingTask.role === "approver"
        ? "You are the current approver. Approve to advance or send back with review points."
        : "You are assigned as reviewer. Complete your review or send back with review points.";
    severity = "info";
    actions = (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" disabled={loading} onClick={() => onTransition("approve", {})}>
          {pendingTask.role === "approver" ? "Approve" : "Approve review"}
        </Button>
        <Button variant="outlined" color="primary" disabled={loading} onClick={() => setReviewOpen(true)}>
          Request changes
        </Button>
      </Box>
    );
  } else if (doc.state === "in_review") {
    headline = "In workflow";
    description = `Waiting on ${doc.current_approver_email || "assignee(s)"}. Stage: ${doc.workflow_stage || "—"}.`;
    severity = "info";
  } else if (doc.state === "approved") {
    headline = "Approved";
    description =
      "This document is approved and locked. Revoke it only when a controlled revision is needed.";
    severity = "success";
    actions = (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {data?.canRevoke && (
          <Button variant="outlined" color="error" disabled={loading} onClick={() => onRevoke?.()}>
            Revoke
          </Button>
        )}
        <Button variant="outlined" color="inherit" disabled={loading} onClick={() => onTransition("archive", {})}>
          Archive document
        </Button>
      </Box>
    );
  }

  if (!headline) return null;

  return (
    <Box sx={{ display: 'block', width: '100%' }}>
      <Alert 
        severity={severity} 
        sx={{ 
          borderRadius: 2, 
          py: 2, 
          px: 3, 
          border: '1px solid',
          borderColor: `${severity}.light`,
          mb: 0 // Ensured no bottom margin so it stacks perfectly
        }}
      >
        <AlertTitle sx={{ typography: 'h6', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {headline}
          <Chip label={status.label} color={status.color} size="small" variant="soft" sx={{ ml: 1, fontWeight: 600 }} />
          {doc.workflow_stage && (
            <Chip label={doc.workflow_stage} color="info" size="small" variant="soft" sx={{ fontWeight: 600 }} />
          )}
        </AlertTitle>

        <Typography variant="body2" sx={{ mb: openReviewPoints.length > 0 ? 2 : 0 }}>
          {description}
        </Typography>

        {openReviewPoints.length > 0 && (
          <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
              {openReviewPoints.length} review point(s) to address:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {openReviewPoints.slice(0, 5).map((p) => (
                <Typography component="li" variant="body2" color="text.secondary" key={p.id}>{p.body}</Typography>
              ))}
            </Box>
          </Box>
        )}
        
        {actions && <Box sx={{ mt: 3 }}>{actions}</Box>}
      </Alert>

      {/* Submit Modal */}
      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit for review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Workflow assignees come from the document type preset. Only pick a first approver if
            no workflow is configured for this type.
          </Typography>
          <Stack direction="column" spacing={3}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>First approver (optional)</Typography>
              <DocEmailSelect 
                initialUsers={users} 
                value={firstApproverEmail} 
                onChange={(val) => setFirstApproverEmail(val)} 
              />
            </Box>
            <StyledTextField
              fullWidth
              multiline
              rows={3}
              label="Note (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button color="inherit" onClick={() => setSubmitOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              onTransition("submit", { comment, firstApproverEmail });
              setSubmitOpen(false);
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Request changes</DialogTitle>
        <DialogContent>
          <StyledTextField
            fullWidth
            multiline
            rows={5}
            label="Review points (one per line)"
            placeholder="Fix section 2&#10;Add signature block"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button color="inherit" onClick={() => setReviewOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="warning"
            disabled={!comment.trim()}
            onClick={() => {
              onTransition("request_changes", {
                comment,
                reviewPoints: String(comment || "")
                  .split(/\n/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              setReviewOpen(false);
            }}
          >
            Send back to author
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}