set search_path to docq, public;

-- Zone: scratch (private dump) | managed (classified + workflow)
alter table documents add column if not exists zone text not null default 'managed';
alter table documents add column if not exists author_email text;
alter table documents add column if not exists department text;
alter table documents add column if not exists version int not null default 1;
alter table documents add column if not exists version_label text;
alter table documents add column if not exists description text;
alter table documents add column if not exists tags jsonb not null default '[]'::jsonb;
alter table documents add column if not exists classification text;
alter table documents add column if not exists submitted_at timestamptz;
alter table documents add column if not exists approved_at timestamptz;
alter table documents add column if not exists current_approver_email text;
alter table documents add column if not exists workflow_mode text not null default 'none';
alter table documents add column if not exists modified_by_email text;
alter table documents add column if not exists search_vector tsvector;

update documents set author_email = created_by_email where author_email is null;
update documents set modified_by_email = created_by_email where modified_by_email is null;

create index if not exists documents_zone_idx on documents(zone);
create index if not exists documents_author_email_idx on documents(author_email);
create index if not exists documents_current_approver_idx on documents(current_approver_email);
create index if not exists documents_search_idx on documents using gin(search_vector);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  workdrive_file_id text not null,
  version int not null,
  version_label text,
  change_summary text,
  uploaded_by_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_versions_document_id_idx
  on document_versions(document_id, version desc);

create table if not exists document_metadata_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_metadata_history_document_id_idx
  on document_metadata_history(document_id, created_at desc);

-- Keep search_vector updated (application also sets on write)
create or replace function docq_documents_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.doc_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.department, '')), 'C');
  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_search_vector_trg on documents;
create trigger documents_search_vector_trg
  before insert or update of title, description, doc_type, department on documents
  for each row execute function docq_documents_search_vector_update();

update documents set title = title where search_vector is null;
