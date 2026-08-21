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
  //const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
  const [comment, setComment] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [reviewCompleteOpen, setReviewCompleteOpen] = useState(false);
  const [raiseApprovalOpen, setRaiseApprovalOpen] = useState(false);
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);

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
      <Button variant="contained" color="error" disabled={loading} onClick={() => setSubmitReviewOpen(true)}>
        Submit revised document
      </Button>
    );
  } else if (doc.state === "draft" && data?.authorCanEdit) {
    headline = "Ready to submit";
    description =
      "This document is a draft. When metadata and file are complete, submit it to start the review workflow. Reviewers and approvers are assigned automatically from the document type workflow.";
    severity = "warning";
    actions = (
      <Button variant="contained" color="warning" disabled={loading} onClick={() => setSubmitReviewOpen(true)}>
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
    if (pendingTask.role === "author_routing") {
      headline = "Review Complete - Ready for Final Approval";
      description = "The reviewer has completed their check. You must now raise this document for final approval.";
      severity = "warning";
      actions = (
        <Button variant="contained" color="primary" disabled={loading} onClick={() => setRaiseApprovalOpen(true)}>
          Raise for Approval
        </Button>
      );
  } else if (pendingTask.role === "reviewer" || pendingTask.role === "approver") {
    const isApprover = pendingTask.role === "approver";
    headline = `Action required — ${isApprover ? "Final Approval" : "Review"}`;
    description = isApprover 
      ? "You are the final approver. Approve to finalize the document, or send back with changes."
      : "You are assigned as reviewer. Complete your review or send back with changes.";
    severity = "info";
    actions = (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" disabled={loading} onClick={() => setReviewCompleteOpen(true)}>
          {isApprover ? "Approve Document" : "Review Complete"}
        </Button>
        <Button variant="outlined" color="primary" disabled={loading} onClick={() => setRequestChangesOpen(true)}>
          Request changes
        </Button>
      </Box>
    );
  } else if (doc.state === "in_review") {
    headline = "In workflow";
    const displayStage = doc.workflow_stage === "adhoc_approval" ? "Approval" : (doc.workflow_stage || " ");
    description = `Waiting on ${doc.current_approver_email || "assignee(s)"}. Stage: ${displayStage}.`;
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
            <Chip 
              label={doc.workflow_stage === "adhoc_approval" ? "Approval" : doc.workflow_stage} 
              color="info" 
              size="small" 
              variant="soft" 
              sx={{ fontWeight: 600 }} 
            />
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

      {/* STAGE 1: Author Submits for Review */}
      <Dialog open={submitReviewOpen} onClose={() => setSubmitReviewOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit for Review</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Reviewer Email</Typography>
            <DocEmailSelect initialUsers={users} value={reviewerEmail} onChange={(val) => setReviewerEmail(val)} allowClear={false} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={() => setSubmitReviewOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" disabled={!reviewerEmail} onClick={() => {
              onTransition("submit", { reviewerEmail });
              setSubmitReviewOpen(false);
          }}>Submit</Button>
        </DialogActions>
      </Dialog>

      {/* STAGE 2: Reviewer/Approver Completes Task */}
      <Dialog open={reviewCompleteOpen} onClose={() => setReviewCompleteOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Complete Task</DialogTitle>
        <DialogContent>
          <StyledTextField sx={{ mt: 2 }} fullWidth multiline rows={3} label="Note (Optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={() => setReviewCompleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={() => {
              onTransition("approve", { comment });
              setReviewCompleteOpen(false);
          }}>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* STAGE 3: Author Raises for Final Approval */}
      <Dialog open={raiseApprovalOpen} onClose={() => setRaiseApprovalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Raise for Final Approval</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Final Approver Email</Typography>
            <DocEmailSelect initialUsers={users} value={approverEmail} onChange={(val) => setApproverEmail(val)} allowClear={false} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={() => setRaiseApprovalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" disabled={!approverEmail} onClick={() => {
              onTransition("approve", { approverEmail });
              setRaiseApprovalOpen(false);
          }}>Raise Approval</Button>
        </DialogActions>
      </Dialog>
      
      {/* Request Changes Modal */}
      <Dialog open={requestChangesOpen} onClose={() => setRequestChangesOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Request changes</DialogTitle>
        <DialogContent>
          <StyledTextField fullWidth multiline rows={5} label="Review points (one per line)" placeholder="Fix section 2" value={comment} onChange={(e) => setComment(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button color="inherit" onClick={() => setRequestChangesOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" disabled={!comment.trim()} onClick={() => {
              onTransition("request_changes", {
                comment,
                reviewPoints: String(comment || "").split(/\n/).map((s) => s.trim()).filter(Boolean),
              });
              setRequestChangesOpen(false);
            }}>Send back to author</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}