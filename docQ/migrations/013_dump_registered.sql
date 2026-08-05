set search_path to docq, public;

-- Dump files stay in personal space after register; flag tracks that a managed copy exists.
alter table documents add column if not exists dump_registered boolean not null default false;
alter table documents add column if not exists registered_managed_id uuid references documents(id) on delete set null;

create index if not exists documents_dump_registered_idx
  on documents(dump_registered)
  where zone = 'scratch';
