set search_path to docq, public;

-- Revoke / under-revision fields on the live document
alter table documents add column if not exists revoke_reason text;
alter table documents add column if not exists revision_of_label text;
alter table documents add column if not exists under_revision_since timestamptz;

-- Mark archived (historical) version rows so UI can distinguish them
alter table document_versions add column if not exists is_historical boolean not null default false;

-- Stamped per-version history (metadata + review/comments/transitions/tasks)
create table if not exists document_history_snapshots (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_label text not null,
  version_major int not null,
  version_minor int not null,
  state_at_snapshot text not null,
  metadata jsonb not null default '{}'::jsonb,
  workdrive_file_id text,
  workdrive_permalink text,
  bundle jsonb not null default '{}'::jsonb,
  stamped_by_email text not null,
  stamped_at timestamptz not null default now(),
  unique (document_id, version_label)
);

create index if not exists document_history_snapshots_document_id_idx
  on document_history_snapshots(document_id, stamped_at desc);
