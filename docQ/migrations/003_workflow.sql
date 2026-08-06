set search_path to docq, public;

create table if not exists approval_chains (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade unique,
  mode text not null,
  steps jsonb not null default '[]'::jsonb,
  current_step_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_chains_document_id_idx on approval_chains(document_id);

create table if not exists approval_tasks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chain_id uuid references approval_chains(id) on delete set null,
  assignee_email text not null,
  step_order int not null default 1,
  status text not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  completed_by_email text,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists approval_tasks_assignee_status_idx
  on approval_tasks(assignee_email, status);
create index if not exists approval_tasks_document_id_idx
  on approval_tasks(document_id, step_order);

create table if not exists review_comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  author_email text not null,
  body text not null,
  transition_id uuid references transition_history(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists review_comments_document_id_idx
  on review_comments(document_id, created_at desc);
