set search_path to docq, public;

-- Native WorkDrive permission id for email shares (kept in sync with document_shares).
alter table document_shares add column if not exists workdrive_permission_id text;
