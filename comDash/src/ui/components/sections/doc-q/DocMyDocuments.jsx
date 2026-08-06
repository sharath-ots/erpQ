"use client";

import DocListView from "./DocListView";

/** Documents authored by the logged-in user. */
export default function DocMyDocuments() {
  return (
    <DocListView
      title="My documents"
      description="All documents you authored — drafts, in review, revisions, and approved."
      view="my"
      authorActions
      emptyHint="No documents yet. Use Create documents to upload a file, or Register documents for files already in your dump folder."
    />
  );
}
