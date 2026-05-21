create extension if not exists pgcrypto;

create table if not exists docq_documents (
  id uuid primary key,
  workdrive_file_id text not null unique,
  workdrive_folder_id text null,
  workdrive_permalink text null,
  doc_type text not null,
  title text null,
  state text not null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docq_documents_state_idx on docq_documents(state);
create index if not exists docq_documents_doc_type_idx on docq_documents(doc_type);

create table if not exists docq_transition_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references docq_documents(id) on delete cascade,
  from_state text null,
  to_state text not null,
  action text not null,
  actor_email text not null,
  actor_name text null,
  comment text null,
  created_at timestamptz not null default now()
);

create index if not exists docq_transition_history_document_id_idx
  on docq_transition_history(document_id, created_at desc);

create table if not exists docq_workflow_definitions (
  doc_type text primary key,
  definition jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by_email text null
);

create table if not exists docq_erpnext_refs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references docq_documents(id) on delete cascade,
  erp_doctype text not null,
  erp_docname text not null,
  fieldname text null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists docq_erpnext_refs_document_id_idx on docq_erpnext_refs(document_id);

create table if not exists docq_zoho_tokens (
  user_email text primary key,
  zoho_id text null,
  refresh_token_alg text not null,
  refresh_token_iv_b64 text not null,
  refresh_token_tag_b64 text not null,
  refresh_token_ciphertext_b64 text not null,
  updated_at timestamptz not null default now()
);

