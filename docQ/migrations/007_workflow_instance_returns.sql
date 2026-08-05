set search_path to docq, public;

alter table workflow_instances add column if not exists last_return_stage_id text;
alter table workflow_instances add column if not exists last_return_role text;
