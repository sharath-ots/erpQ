"use client";

import DocListView from "./DocListView";

export default function DocLibrary({ view = "all", title, showActions = false }) {
  const config = {
    all: {
      title: title || "All documents",
      view: null,
    },
    my: {
      title: title || "My documents",
      view: "my",
    },
    changes_requested: {
      title: title || "Revision",
      description: "Your documents sent back for rework. Open each one, fix the review points, then resubmit.",
      view: "changes_requested",
      authorActions: true,
      emptyHint: "No documents waiting for revision.",
    },
    for_review: {
      title: title || "Documents for Review",
      description: "Documents assigned to you for review. Open a document to approve or request changes.",
      view: "for_review",
      showActions: true,
      emptyHint: "No documents waiting for your review.",
    },
    for_approval: {
      title: title || "Documents for Approval",
      description: "Documents assigned to you for final approval.",
      view: "for_approval",
      showActions: true,
      emptyHint: "No documents waiting for your approval.",
    },
    archived: {
      title: title || "Archived documents",
      description: "Approved documents that have been archived.",
      view: "archived",
      emptyHint: "No archived documents.",
    },
    shared_with_me: {
      title: title || "Shared with me",
      view: "shared_with_me",
      emptyHint: "Nothing has been shared with you yet.",
    },
    shared_by_me: {
      title: title || "Shared by me",
      view: "shared_by_me",
      emptyHint: "You haven't shared any documents yet.",
    },
    revocable: {
      title: title || "Revoke documents",
      description:
        "Approved documents you are allowed to revoke for revision. Open a document and use Revoke, or use the Revoke action in the list.",
      view: "revocable",
      showActions: true,
      emptyHint: "No approved documents you can revoke right now.",
    },
  };

  const c = config[view] || config.all;

  return (
    <DocListView
      title={c.title}
      description={c.description}
      view={c.view}
      showActions={showActions || c.showActions}
      authorActions={c.authorActions}
      emptyHint={c.emptyHint}
    />
  );
}
