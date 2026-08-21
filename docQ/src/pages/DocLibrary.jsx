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
      view: "changes_requested",
      authorActions: true,
      emptyHint: "No documents waiting for revision.",
    },
    for_review: {
      title: title || "Documents for Review",
      view: "for_review",
      showActions: true,
      emptyHint: "No documents waiting for your review.",
    },
    for_approval: {
      title: title || "Documents for Approval",
      view: "for_approval",
      showActions: true,
      emptyHint: "No documents waiting for your approval.",
    },
    archived: {
      title: title || "Archived documents",
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
