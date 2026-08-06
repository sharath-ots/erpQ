set search_path to docq, public;

-- One row per sold customer (Zoho organization) for WorkDrive library roots.
create table if not exists tenants (
  id text primary key,
  name text not null,
  allowed_email_domains jsonb not null default '[]'::jsonb,
  zoho_org_id text,
  zoho_team_id text,
  workdrive_parent_id text,
  managed_folder_id text,
  dump_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_zoho_org_id_idx on tenants(zoho_org_id);

-- Cache of ensured shared library folders (per tenant + team parent).
create table if not exists workdrive_library (
  tenant_id text not null references tenants(id) on delete cascade,
  parent_folder_id text not null,
  managed_folder_id text,
  dump_folder_id text,
  ensured_by_email text,
  ensured_at timestamptz not null default now(),
  primary key (tenant_id, parent_folder_id)
);
