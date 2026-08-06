set search_path to docq, public;

-- Projects: group managed documents; each project gets a WorkDrive folder under the vault.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_key text not null unique,
  name text not null,
  description text,
  workdrive_folder_id text,
  active boolean not null default true,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_active_idx on projects(active, name);

alter table documents add column if not exists project_id uuid references projects(id) on delete set null;
create index if not exists documents_project_id_idx on documents(project_id);
