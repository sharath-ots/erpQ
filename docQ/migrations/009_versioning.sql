set search_path to docq, public;

-- Decimal versioning: major.minor (0.1 drafts, 1.0 on first approval, etc.)
alter table documents add column if not exists version_major int;
alter table documents add column if not exists version_minor int;

alter table document_versions add column if not exists version_major int;
alter table document_versions add column if not exists version_minor int;

-- Backfill documents from version_label when it looks like M.N
update documents
set
  version_major = split_part(version_label, '.', 1)::int,
  version_minor = split_part(version_label, '.', 2)::int
where version_label ~ '^\d+\.\d+$'
  and (version_major is null or version_minor is null);

-- Approved / archived without a decimal label -> 1.0
update documents
set version_major = 1, version_minor = 0, version_label = '1.0'
where state in ('approved', 'archived')
  and (version_major is null or version_minor is null);

-- Everything else (drafts, in_review, etc.) -> 0.1
update documents
set version_major = 0, version_minor = 1, version_label = '0.1'
where version_major is null or version_minor is null;

-- Enforce NOT NULL after backfill
alter table documents alter column version_major set default 0;
alter table documents alter column version_minor set default 1;
alter table documents alter column version_major set not null;
alter table documents alter column version_minor set not null;

-- Backfill document_versions from their own version_label, then from parent document
update document_versions
set
  version_major = split_part(version_label, '.', 1)::int,
  version_minor = split_part(version_label, '.', 2)::int
where version_label ~ '^\d+\.\d+$'
  and (version_major is null or version_minor is null);

update document_versions dv
set
  version_major = d.version_major,
  version_minor = d.version_minor,
  version_label = coalesce(nullif(dv.version_label, ''), d.version_label)
from documents d
where dv.document_id = d.id
  and (dv.version_major is null or dv.version_minor is null);

update document_versions
set version_major = 0, version_minor = 1, version_label = coalesce(nullif(version_label, ''), '0.1')
where version_major is null or version_minor is null;

alter table document_versions alter column version_major set default 0;
alter table document_versions alter column version_minor set default 1;
alter table document_versions alter column version_major set not null;
alter table document_versions alter column version_minor set not null;

-- Keep legacy int "version" roughly in sync (major*10 + minor) for ordering helpers
update documents
set version = greatest(1, version_major * 10 + version_minor)
where version is distinct from greatest(1, version_major * 10 + version_minor);

update document_versions
set version = greatest(1, version_major * 10 + version_minor)
where version is distinct from greatest(1, version_major * 10 + version_minor);
