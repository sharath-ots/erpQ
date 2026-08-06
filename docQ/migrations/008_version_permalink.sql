set search_path to docq, public;

-- Store a direct WorkDrive link per version so each version row can be opened individually.
alter table document_versions add column if not exists workdrive_permalink text;

-- Backfill: the version whose file matches the document's current file gets the document's permalink.
update document_versions dv
set workdrive_permalink = d.workdrive_permalink
from documents d
where dv.document_id = d.id
  and dv.workdrive_file_id = d.workdrive_file_id
  and dv.workdrive_permalink is null
  and d.workdrive_permalink is not null;
