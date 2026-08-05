set search_path to docq, public;

-- Workflow V2: stages, review rounds, extended metadata (fresh-start friendly).

alter table documents add column if not exists workflow_stage text;
alter table documents add column if not exists review_round int not null default 0;
alter table documents add column if not exists reference_number text;
alter table documents add column if not exists custom_metadata jsonb not null default '{}'::jsonb;

create index if not exists documents_workflow_stage_idx on documents(workflow_stage);
create index if not exists documents_reference_number_idx on documents(reference_number);

comment on column documents.workflow_stage is 'review | approval | null when not in workflow';
comment on column documents.custom_metadata is 'Doc-type-specific fields (keys from doc_type_definitions)';

-- Structured review points (created on send-back; resolved by author on resubmit).
create table if not exists review_points (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  round int not null default 1,
  stage_id text not null,
  author_email text not null,
  body text not null,
  status text not null default 'open',
  requires_action_by text not null default 'author',
  created_by_email text not null,
  resolved_at timestamptz,
  resolved_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists review_points_document_id_idx
  on review_points(document_id, round desc, created_at desc);
create index if not exists review_points_open_idx
  on review_points(document_id, status) where status = 'open';

-- Active workflow instance per document (snapshot of definition at submit time).
create table if not exists workflow_instances (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade unique,
  doc_type text not null,
  definition_version int not null default 2,
  definition_snapshot jsonb not null,
  current_stage_id text,
  current_stage_index int not null default 0,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists workflow_instances_status_idx on workflow_instances(status);

-- V2 tasks: reviewers and approvers with stage context.
create table if not exists workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  instance_id uuid not null references workflow_instances(id) on delete cascade,
  stage_id text not null,
  role text not null,
  assignee_email text not null,
  step_order int not null default 1,
  status text not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  completed_by_email text,
  decision text,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists workflow_tasks_assignee_status_idx
  on workflow_tasks(assignee_email, status);
create index if not exists workflow_tasks_document_id_idx
  on workflow_tasks(document_id, stage_id, step_order);

-- Default V2 workflow template for common doc types (admin can override via API).
insert into workflow_definitions (doc_type, definition, updated_by_email)
values
  (
    'general',
    '{
      "version": 2,
      "stages": [
        {
          "id": "review",
          "label": "Review",
          "role": "reviewer",
          "mode": "parallel",
          "quorum": "all",
          "assignees": [{ "type": "reports_to", "departmentFromDoc": true }],
          "allowSendBack": true,
          "sendBackTargets": ["author"]
        },
        {
          "id": "approval",
          "label": "Approval",
          "role": "approver",
          "mode": "sequential",
          "assignees": [{ "type": "role", "value": "Manager", "departmentFromDoc": true }],
          "allowSendBack": true,
          "sendBackTargets": ["author", "reviewers"],
          "onResubmit": "return_to_approval"
        }
      ],
      "rules": { "requireNewVersionOnResubmit": true, "slaDays": 5 }
    }'::jsonb,
    'system'
  )
on conflict (doc_type) do update set
  definition = excluded.definition,
  updated_at = now();
