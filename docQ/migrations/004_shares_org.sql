set search_path to docq, public;

create table if not exists document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  grantee_email text,
  grantee_department text,
  permission text not null,
  granted_by_email text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (grantee_email is not null or grantee_department is not null)
);

create index if not exists document_shares_document_id_idx on document_shares(document_id);
create index if not exists document_shares_grantee_email_idx on document_shares(grantee_email);

create table if not exists org_cache (
  email text primary key,
  employee_id text,
  employee_name text,
  department text,
  designation text,
  reports_to_email text,
  roles jsonb not null default '[]'::jsonb,
  role_profile_name text,
  synced_at timestamptz not null default now()
);

create index if not exists org_cache_department_idx on org_cache(department);

create table if not exists doc_type_definitions (
  doc_type text primary key,
  label text not null,
  description text,
  required_fields jsonb not null default '[]'::jsonb,
  optional_fields jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by_email text
);

insert into doc_type_definitions (doc_type, label, description) values
  ('manual', 'Manual', 'Operating manuals and SOPs'),
  ('contract', 'Contract', 'Legal contracts and agreements'),
  ('design', 'Design', 'Design documents and drawings'),
  ('cad', 'CAD', 'CAD files and technical models'),
  ('spec', 'Specification', 'Technical specifications'),
  ('policy', 'Policy', 'Corporate policies'),
  ('general', 'General', 'General managed documents')
on conflict (doc_type) do nothing;
